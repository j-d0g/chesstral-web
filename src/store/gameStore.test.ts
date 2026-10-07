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
