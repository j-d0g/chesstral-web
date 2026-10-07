import { Chess } from 'chess.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiService } from '../services/apiService'
import { initialClock } from '../utils/clock'
import { useGameStore } from './gameStore'

vi.mock('../services/apiService', () => ({
  apiService: {
    getEngines: vi.fn(),
    getMove: vi.fn(),
    evaluatePosition: vi.fn(),
  },
  describeApiError: vi.fn((error: unknown) => String(error)),
}))

const START_FEN = new Chess().fen()

function configureStore(
  fen = START_FEN,
  options: {
    gameMode?: 'landing' | 'competitive' | 'research'
    gameStatus?: 'setup' | 'active' | 'finished'
    playerSide?: 'white' | 'black'
    timeFormat?: 'blitz' | 'rapid' | 'classical' | 'unlimited'
  } = {},
): void {
  const game = new Chess(fen)
  const timeFormat = options.timeFormat ?? 'rapid'
  useGameStore.setState({
    game,
    gameState: {
      fen: game.fen(),
      pgn: game.history(),
      turn: game.turn(),
      isGameOver: false,
      result: null,
    },
    gameMode: options.gameMode ?? 'research',
    gameStatus: options.gameStatus ?? 'setup',
    playerSide: options.playerSide ?? 'white',
    isThinking: false,
    evaluation: null,
    commentaryHistory: [],
    timeFormat,
    clock: initialClock(timeFormat),
    startFen: fen,
    positionVersion: 0,
    currentMoveIndex: -1,
    fullGamePgn: [],
    error: null,
    errorIsAiMove: false,
  })
}

function setMoves(moves: string[]): void {
  const game = new Chess(START_FEN)
  for (const move of moves) game.move(move)
  const history = game.history()
  useGameStore.setState({
    game,
    gameState: {
      fen: game.fen(),
      pgn: history,
      turn: game.turn(),
      isGameOver: game.isGameOver(),
      result: null,
    },
    startFen: START_FEN,
    fullGamePgn: history,
    currentMoveIndex: history.length - 1,
  })
}

describe('game store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiService.getMove).mockImplementation(() => new Promise(() => {}))
    vi.mocked(apiService.evaluatePosition).mockResolvedValue({ evaluation: 0, mate: null })
    configureStore()
  })

  it('returns synchronously for legal and illegal human moves', () => {
    configureStore(START_FEN, { gameStatus: 'active', playerSide: 'black' })
    expect(useGameStore.getState().makeHumanMove({ from: 'e2', to: 'e4' })).toBe(false)

    configureStore(START_FEN, { gameStatus: 'active' })
    expect(useGameStore.getState().makeHumanMove({ from: 'e2', to: 'e5' })).toBe(false)
    expect(useGameStore.getState().makeHumanMove({ from: 'e2', to: 'e4' })).toBe(true)
    expect(useGameStore.getState().fullGamePgn).toEqual(['e4'])
  })

  it('replays navigation from a FEN-only starting position', () => {
    const customFen = '7k/8/8/8/8/8/P7/7K w - - 0 1'
    configureStore(customFen, { gameStatus: 'active' })

    expect(useGameStore.getState().loadPosition(customFen)).toBe(true)
    expect(useGameStore.getState().makeHumanMove({ from: 'a2', to: 'a3' })).toBe(true)
    useGameStore.setState({ isThinking: false })
    useGameStore.getState().goToStart()

    expect(useGameStore.getState().startFen).toBe(customFen)
    expect(useGameStore.getState().game.fen()).toBe(customFen)
  })

  it('loads PGN moves from the supplied starting position', () => {
    configureStore(START_FEN, { playerSide: 'black' })
    expect(useGameStore.getState().loadPosition(START_FEN, ['e4', 'e5', 'Nf3'])).toBe(true)
    expect(useGameStore.getState().fullGamePgn).toEqual(['e4', 'e5', 'Nf3'])
    expect(useGameStore.getState().gameState.fen).toBe(new Chess('rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2').fen())

    const customFen = '7k/8/8/8/8/8/P7/7K w - - 0 1'
    expect(useGameStore.getState().loadPosition(customFen, ['a3'])).toBe(true)
    const expected = new Chess(customFen)
    expected.move('a3')
    expect(useGameStore.getState().startFen).toBe(customFen)
    expect(useGameStore.getState().game.fen()).toBe(expected.fen())
  })

  it('loads PGN moves from a SetUp FEN header', () => {
    const startFen = '8/P7/8/8/8/8/8/k6K w - - 0 1'
    configureStore(START_FEN, { playerSide: 'black' })

    expect(useGameStore.getState().loadPgn(
      `[SetUp "1"]\n[FEN "${startFen}"]\n\n1. a8=N`,
    )).toBe(true)
    expect(useGameStore.getState().startFen).toBe(startFen)
    expect(useGameStore.getState().fullGamePgn).toEqual(['a8=N'])
  })

  it('loads ordinary PGN with headers', () => {
    configureStore(START_FEN, { playerSide: 'white' })

    expect(useGameStore.getState().loadPgn('[Event "x"]\n\n1. e4 e5')).toBe(true)
    expect(useGameStore.getState().startFen).toBe(START_FEN)
    expect(useGameStore.getState().fullGamePgn).toEqual(['e4', 'e5'])
  })

  it('returns false for invalid PGN', () => {
    expect(useGameStore.getState().loadPgn('[Event "x"]\n\n1. e4 e5 2. e5')).toBe(false)
  })

  it('evaluates checkmate locally from White’s perspective', async () => {
    configureStore('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1')

    await useGameStore.getState().evaluatePosition()

    expect(useGameStore.getState().evaluation).toEqual({ score: 1000, mate: 0 })
    expect(apiService.evaluatePosition).not.toHaveBeenCalled()
  })

  it('evaluates stalemate locally as a draw', async () => {
    configureStore('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')

    await useGameStore.getState().evaluatePosition()

    expect(useGameStore.getState().evaluation).toEqual({ score: 0, mate: null })
    expect(apiService.evaluatePosition).not.toHaveBeenCalled()
  })

  it('truncates future moves when continuing from a replayed position', () => {
    useGameStore.getState().loadPosition(START_FEN, ['e4', 'e5', 'Nf3', 'Nc6'])
    useGameStore.getState().goToMove(1)
    useGameStore.getState().continueFromHere()

    expect(useGameStore.getState().fullGamePgn).toEqual(['e4', 'e5'])
    expect(useGameStore.getState().currentMoveIndex).toBe(1)
  })

  it('discards an AI response after the game resets', async () => {
    const afterE4 = new Chess()
    afterE4.move('e4')
    configureStore(afterE4.fen(), { gameStatus: 'active' })
    let resolveMove!: (response: { move: string }) => void
    vi.mocked(apiService.getMove).mockReturnValue(
      new Promise((resolve) => { resolveMove = resolve }),
    )

    const pendingMove = useGameStore.getState().getAIMove()
    useGameStore.getState().resetGame()
    resolveMove({ move: 'e5' })
    await pendingMove

    expect(useGameStore.getState().game.fen()).toBe(START_FEN)
    expect(useGameStore.getState().fullGamePgn).toEqual([])
  })

  it('honors the selected promotion piece', () => {
    const promotionFen = '7k/P7/8/8/8/8/8/7K w - - 0 1'
    configureStore(promotionFen, { gameStatus: 'active' })

    expect(useGameStore.getState().makeHumanMove({
      from: 'a7',
      to: 'a8',
      promotion: 'n',
    })).toBe(true)
    expect(useGameStore.getState().game.get('a8')?.type).toBe('n')
  })

  it('finishes on resignation and timeout', () => {
    configureStore(START_FEN, { gameStatus: 'active' })
    useGameStore.setState({ isThinking: true })
    useGameStore.getState().resignGame()
    expect(useGameStore.getState().gameStatus).toBe('finished')
    expect(useGameStore.getState().gameState.result).toBe('White resigned')
    expect(useGameStore.getState().isThinking).toBe(false)

    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    configureStore(START_FEN, { gameMode: 'competitive', timeFormat: 'blitz' })
    useGameStore.getState().startGame()
    now.mockReturnValue(181_001)
    useGameStore.getState().tickClock()
    expect(useGameStore.getState().gameStatus).toBe('finished')
    expect(useGameStore.getState().gameState.result).toBe('White loses on time')
    now.mockRestore()
  })

  it('switches research sides without resetting the current game', () => {
    configureStore(START_FEN, { gameStatus: 'active' })
    setMoves(['e4'])
    const commentary = [{
      engineName: 'stockfish',
      moveNumber: '1.',
      moveSequence: 'e4',
      commentary: 'Opening move',
      fen: useGameStore.getState().game.fen(),
      move: 'e4',
      reviewed: false,
    }]
    useGameStore.setState({
      commentaryHistory: commentary,
      gameId: 'original-game',
      error: 'previous error',
      errorIsAiMove: true,
    })
    const before = useGameStore.getState()

    before.switchSides()

    const after = useGameStore.getState()
    expect(after.playerSide).toBe('black')
    expect(after.fullGamePgn).toBe(before.fullGamePgn)
    expect(after.fullGamePgn).toEqual(['e4'])
    expect(after.game).toBe(before.game)
    expect(after.startFen).toBe(before.startFen)
    expect(after.gameId).toBe('original-game')
    expect(after.commentaryHistory).toBe(commentary)
    expect(after.error).toBeNull()
    expect(after.errorIsAiMove).toBe(false)
    expect(apiService.getMove).not.toHaveBeenCalled()
  })

  it('requests an AI move after switching sides at the start of a research game', () => {
    configureStore(START_FEN, { gameStatus: 'active' })
    const before = useGameStore.getState()

    before.switchSides()

    expect(useGameStore.getState().playerSide).toBe('black')
    expect(useGameStore.getState().fullGamePgn).toEqual([])
    expect(useGameStore.getState().game).toBe(before.game)
    expect(apiService.getMove).toHaveBeenCalledTimes(1)
  })

  it('does not switch sides during an active competitive game', () => {
    configureStore(START_FEN, { gameMode: 'competitive', gameStatus: 'active' })
    const before = useGameStore.getState()

    before.switchSides()

    expect(useGameStore.getState().playerSide).toBe('white')
    expect(useGameStore.getState().positionVersion).toBe(before.positionVersion)
    expect(apiService.getMove).not.toHaveBeenCalled()
  })

  it('starts a new game on rematch after switching sides', () => {
    configureStore(START_FEN, {
      gameMode: 'competitive',
      gameStatus: 'finished',
      playerSide: 'black',
    })
    setMoves(['e4'])
    const oldGameId = useGameStore.getState().gameId

    useGameStore.getState().rematch()

    expect(useGameStore.getState().playerSide).toBe('white')
    expect(useGameStore.getState().gameStatus).toBe('active')
    expect(useGameStore.getState().fullGamePgn).toEqual([])
    expect(useGameStore.getState().currentMoveIndex).toBe(-1)
    expect(useGameStore.getState().gameId).not.toBe(oldGameId)
  })

  it('reopens a nonterminal position after a finished research game', () => {
    configureStore(START_FEN, { gameStatus: 'active' })
    useGameStore.getState().resignGame()
    expect(useGameStore.getState().gameStatus).toBe('finished')

    expect(useGameStore.getState().loadPosition(START_FEN)).toBe(true)
    expect(useGameStore.getState().gameStatus).toBe('active')

    const mateFen = '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1'
    expect(useGameStore.getState().loadPosition(mateFen)).toBe(true)
    expect(useGameStore.getState().gameStatus).toBe('finished')
  })

  it('charges the live side to move while browsing move history', () => {
    configureStore(START_FEN, {
      gameMode: 'competitive',
      gameStatus: 'active',
      timeFormat: 'blitz',
    })
    useGameStore.getState().loadPosition(START_FEN, ['e4', 'e5'])
    useGameStore.getState().goToMove(0)
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_200)
    useGameStore.setState({
      clock: { white: 10_000, black: 8_000, runningSince: 1_000 },
    })

    useGameStore.getState().tickClock()

    expect(useGameStore.getState().clock.white).toBe(9_800)
    expect(useGameStore.getState().clock.black).toBe(8_000)
    now.mockRestore()
  })
})
