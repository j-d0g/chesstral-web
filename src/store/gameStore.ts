import { Chess } from 'chess.js'
import { create } from 'zustand'
import { apiService, describeApiError } from '../services/apiService'
import type { EngineInfo } from '../services/apiService'
import type { CommentaryMessage } from '../types/CommentaryMessage'
import {
  applyMove as applyClockMove,
  incrementFor,
  initialClock,
  sideToMoveAfter,
  tick as tickClockState,
} from '../utils/clock'
import type { ClockFormat, ClockSide, ClockState } from '../utils/clock'

const START_FEN = new Chess().fen()

export interface Evaluation {
  score: number
  mate: number | null
}

interface EngineConfig {
  type: string
  model?: string
}

interface GameState {
  fen: string
  pgn: string[]
  turn: 'w' | 'b'
  isGameOver: boolean
  result: string | null
}

type MoveInput = string | { from: string; to: string; promotion?: string }

interface GameStore {
  engines: EngineInfo[]
  enginesError: string | null
  enginesLoading: boolean
  game: Chess
  gameState: GameState
  gameMode: 'landing' | 'competitive' | 'research'
  gameStatus: 'setup' | 'active' | 'finished'
  selectedEngine: EngineConfig
  playerSide: ClockSide
  isThinking: boolean
  evaluation: Evaluation | null
  commentaryHistory: CommentaryMessage[]
  temperature: number
  timeFormat: ClockFormat
  clock: ClockState
  startFen: string
  positionVersion: number
  gameId: string
  error: string | null
  errorIsAiMove: boolean
  currentMoveIndex: number
  fullGamePgn: string[]
  loadEngines: () => Promise<void>
  makeHumanMove: (move: MoveInput) => boolean
  startGame: () => void
  resetGame: () => void
  resignGame: () => void
  setGameMode: (mode: 'landing' | 'competitive' | 'research') => void
  switchSides: () => void
  rematch: () => void
  setEngine: (engine: EngineConfig) => void
  setPlayerSide: (side: ClockSide) => void
  setTemperature: (temp: number) => void
  setTimeFormat: (format: ClockFormat) => void
  loadPosition: (fen: string, pgn?: string[]) => boolean
  loadPgn: (pgnText: string) => boolean
  getAIMove: () => Promise<void>
  retryAIMove: () => Promise<void>
  evaluatePosition: () => Promise<void>
  tickClock: () => void
  dismissError: () => void
  addCommentaryMessage: (message: CommentaryMessage) => void
  markCommentaryReviewed: (index: number) => void
  goToMove: (moveIndex: number) => void
  goToNextMove: () => void
  goToPreviousMove: () => void
  goToStart: () => void
  goToEnd: () => void
  continueFromHere: () => void
}

function replayGame(startFen: string, moves: string[], moveCount = moves.length): Chess {
  const game = new Chess(startFen)
  for (const move of moves.slice(0, moveCount)) game.move(move)
  return game
}

function gameResult(game: Chess): string | null {
  if (game.isCheckmate()) return `${game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate`
  if (game.isStalemate()) return 'Draw by stalemate'
  if (game.isDraw()) return 'Draw'
  return null
}

function gameStateFor(game: Chess, pgn = game.history()): GameState {
  const isGameOver = game.isGameOver()
  return {
    fen: game.fen(),
    pgn,
    turn: game.turn(),
    isGameOver,
    result: isGameOver ? gameResult(game) : null,
  }
}

function isAiTurn(game: Chess, playerSide: ClockSide): boolean {
  return (game.turn() === 'w' && playerSide === 'black') ||
    (game.turn() === 'b' && playerSide === 'white')
}

function chooseEngine(engines: EngineInfo[]): EngineInfo | undefined {
  const available = engines.filter((engine) => engine.status === 'available')
  return (
    available.find((engine) => engine.name === 'nanogpt' && engine.models.length > 0) ??
    available.find((engine) => engine.name === 'stockfish') ??
    available[0]
  )
}

function clockIsActive(gameMode: GameStore['gameMode'], format: ClockFormat): boolean {
  return gameMode === 'competitive' && format !== 'unlimited'
}

function newGameId(): string {
  return crypto.randomUUID()
}

export const useGameStore = create<GameStore>((set, get) => ({
  engines: [],
  enginesError: null,
  enginesLoading: true,
  game: new Chess(),
  gameState: gameStateFor(new Chess()),
  gameMode: 'landing',
  gameStatus: 'setup',
  selectedEngine: { type: 'nanogpt', model: 'small-8' },
  playerSide: 'white',
  isThinking: false,
  evaluation: null,
  commentaryHistory: [],
  temperature: 0.01,
  timeFormat: 'rapid',
  clock: initialClock('rapid'),
  startFen: START_FEN,
  positionVersion: 0,
  gameId: newGameId(),
  error: null,
  errorIsAiMove: false,
  currentMoveIndex: -1,
  fullGamePgn: [],

  loadEngines: async () => {
    set({ enginesLoading: true, enginesError: null })
    try {
      const engines = await apiService.getEngines()
      const selectedEngine = get().selectedEngine
      const selectedInfo = engines.find(
        (engine) => engine.name === selectedEngine.type && engine.status === 'available',
      )
      let nextEngine = selectedEngine
      if (!selectedInfo || (selectedInfo.name === 'nanogpt' && selectedInfo.models.length === 0)) {
        const preferred = chooseEngine(engines)
        if (preferred) nextEngine = { type: preferred.name, model: preferred.models[0] }
      } else if (
        selectedInfo.models.length > 0 &&
        !selectedInfo.models.includes(selectedEngine.model ?? '')
      ) {
        nextEngine = { type: selectedInfo.name, model: selectedInfo.models[0] }
      }

      set({
        engines,
        enginesError: null,
        enginesLoading: false,
        selectedEngine: nextEngine,
      })

      const state = get()
      if (
        state.gameMode === 'research' &&
        state.gameStatus === 'setup' &&
        engines.some((engine) => engine.status === 'available')
      ) {
        state.startGame()
      }
    } catch (error) {
      set({
        engines: [],
        enginesError: describeApiError(error),
        enginesLoading: false,
      })
    }
  },

  makeHumanMove: (move) => {
    const state = get()
    if (
      state.gameStatus !== 'active' ||
      state.isThinking ||
      state.currentMoveIndex !== state.fullGamePgn.length - 1 ||
      !state.gameState ||
      !((state.game.turn() === 'w' && state.playerSide === 'white') ||
        (state.game.turn() === 'b' && state.playerSide === 'black'))
    ) {
      return false
    }

    let nextGame: Chess
    try {
      nextGame = replayGame(state.startFen, state.fullGamePgn)
      const result = nextGame.move(move)
      if (!result) return false

      const now = Date.now()
      const mover: ClockSide = result.color === 'w' ? 'white' : 'black'
      let nextClock = state.clock
      if (clockIsActive(state.gameMode, state.timeFormat)) {
        const beforeMove = tickClockState(state.clock, state.game.turn(), now)
        if (beforeMove[mover] === 0) {
          set((current) => ({
            clock: { ...beforeMove, runningSince: null },
            gameState: {
              ...current.gameState,
              isGameOver: true,
              result: `${mover === 'white' ? 'White' : 'Black'} loses on time`,
            },
            gameStatus: 'finished',
            isThinking: false,
            positionVersion: current.positionVersion + 1,
          }))
          return false
        }
        nextClock = applyClockMove(beforeMove, mover, now, incrementFor(state.timeFormat))
      }

      const moves = nextGame.history()
      const moveNumber = Math.ceil(moves.length / 2)
      const isGameOver = nextGame.isGameOver()
      const resultText = isGameOver ? gameResult(nextGame) : null
      const clock = isGameOver ? { ...nextClock, runningSince: null } : nextClock
      const message: CommentaryMessage = {
        engineName: 'You',
        moveNumber: result.color === 'w' ? `${moveNumber}.` : `${moveNumber}...`,
        moveSequence: result.san,
        commentary: '',
        fen: nextGame.fen(),
        move: result.san,
        reviewed: false,
      }

      set({
        game: nextGame,
        gameState: {
          fen: nextGame.fen(),
          pgn: moves,
          turn: nextGame.turn(),
          isGameOver,
          result: resultText,
        },
        gameStatus: isGameOver ? 'finished' : 'active',
        fullGamePgn: moves,
        currentMoveIndex: moves.length - 1,
        commentaryHistory: [...state.commentaryHistory, message],
        clock,
        evaluation: null,
        error: null,
        errorIsAiMove: false,
        positionVersion: state.positionVersion + 1,
      })

      if (state.gameMode === 'research') void get().evaluatePosition()
      if (!isGameOver) {
        void get().getAIMove()
      }
      return true
    } catch {
      return false
    }
  },

  startGame: () => {
    const state = get()
    const game = new Chess()
    const clock = initialClock(state.timeFormat)
    const now = Date.now()
    const runningClock = clockIsActive(state.gameMode, state.timeFormat)
      ? { ...clock, runningSince: now }
      : clock

    set({
      game,
      gameState: gameStateFor(game),
      gameStatus: 'active',
      isThinking: false,
      evaluation: null,
      commentaryHistory: [],
      clock: runningClock,
      startFen: START_FEN,
      positionVersion: state.positionVersion + 1,
      gameId: newGameId(),
      error: null,
      errorIsAiMove: false,
      currentMoveIndex: -1,
      fullGamePgn: [],
    })

    if (state.gameMode === 'research') void get().evaluatePosition()
    if (state.playerSide === 'black') void get().getAIMove()
  },

  resetGame: () => {
    const state = get()
    if (state.gameMode === 'research') {
      get().startGame()
      return
    }

    const game = new Chess()
    set({
      game,
      gameState: gameStateFor(game),
      gameStatus: 'setup',
      isThinking: false,
      evaluation: null,
      commentaryHistory: [],
      clock: initialClock(state.timeFormat),
      startFen: START_FEN,
      positionVersion: state.positionVersion + 1,
      gameId: newGameId(),
      error: null,
      errorIsAiMove: false,
      currentMoveIndex: -1,
      fullGamePgn: [],
    })
  },

  resignGame: () => {
    const state = get()
    if (state.gameStatus !== 'active') return
    set({
      gameState: {
        ...state.gameState,
        isGameOver: true,
        result: `${state.playerSide === 'white' ? 'White' : 'Black'} resigned`,
      },
      gameStatus: 'finished',
      clock: { ...state.clock, runningSince: null },
      isThinking: false,
      positionVersion: state.positionVersion + 1,
    })
  },

  setGameMode: (mode) => {
    const state = get()
    if (mode === 'landing') {
      set({
        gameMode: mode,
        gameStatus: 'setup',
        isThinking: false,
        clock: { ...state.clock, runningSince: null },
        positionVersion: state.positionVersion + 1,
      })
      return
    }
    if (mode === 'competitive') {
      set({
        gameMode: mode,
        gameStatus: 'setup',
        isThinking: false,
        evaluation: null,
        clock: initialClock(state.timeFormat),
        positionVersion: state.positionVersion + 1,
      })
      return
    }

    const preferred = chooseEngine(state.engines)
    let selectedEngine = state.selectedEngine
    const selectedIsAvailable = state.engines.some(
      (engine) =>
        engine.name === selectedEngine.type &&
        engine.status === 'available' &&
        (engine.name !== 'nanogpt' || engine.models.length > 0),
    )
    if (!selectedIsAvailable && preferred) {
      selectedEngine = { type: preferred.name, model: preferred.models[0] }
    }
    set({
      gameMode: mode,
      gameStatus: 'setup',
      selectedEngine,
    })
    if (state.engines.some((engine) => engine.status === 'available')) get().startGame()
  },

  switchSides: () => {
    const state = get()
    if (
      state.isThinking ||
      state.gameMode === 'landing' ||
      (state.gameMode === 'competitive' && state.gameStatus === 'active')
    ) {
      return
    }
    set({
      playerSide: state.playerSide === 'white' ? 'black' : 'white',
      positionVersion: state.positionVersion + 1,
      error: null,
      errorIsAiMove: false,
    })
    const current = get()
    if (
      current.gameStatus === 'active' &&
      current.currentMoveIndex === current.fullGamePgn.length - 1 &&
      isAiTurn(current.game, current.playerSide)
    ) {
      void current.getAIMove()
    }
  },

  rematch: () => {
    const state = get()
    set({ playerSide: state.playerSide === 'white' ? 'black' : 'white' })
    get().startGame()
  },

  setEngine: (engine) => {
    const state = get()
    if (state.isThinking) return
    set({
      selectedEngine: engine,
      positionVersion: state.positionVersion + 1,
      error: null,
      errorIsAiMove: false,
    })
    const next = get()
    if (next.gameStatus === 'active' && isAiTurn(next.game, next.playerSide)) {
      void next.getAIMove()
    }
  },

  setPlayerSide: (side) => {
    const state = get()
    if (state.isThinking || state.playerSide === side) return
    set({ playerSide: side, positionVersion: state.positionVersion + 1 })
  },

  setTemperature: (temperature) => set({ temperature }),

  setTimeFormat: (timeFormat) => {
    const state = get()
    set({ timeFormat, clock: initialClock(timeFormat), positionVersion: state.positionVersion + 1 })
  },

  loadPosition: (fen, pgn) => {
    const state = get()
    if (state.isThinking) return false
    try {
      const startFen = fen || START_FEN
      const game = new Chess(startFen)
      if (pgn !== undefined) {
        for (const move of pgn) game.move(move)
      }

      const moves = game.history()
      const nextState = gameStateFor(game, moves)
      const isActive = state.gameStatus === 'active'
      const gameStatus = state.gameMode === 'research' || isActive
        ? game.isGameOver() ? 'finished' : 'active'
        : state.gameStatus
      const now = Date.now()
      const baseClock = initialClock(state.timeFormat)
      const clock = isActive && clockIsActive(state.gameMode, state.timeFormat)
        ? { ...baseClock, runningSince: now }
        : baseClock
      set({
        game,
        gameState: nextState,
        gameStatus,
        startFen,
        fullGamePgn: moves,
        currentMoveIndex: moves.length - 1,
        commentaryHistory: [],
        evaluation: null,
        clock: game.isGameOver() ? { ...clock, runningSince: null } : clock,
        gameId: newGameId(),
        error: null,
        errorIsAiMove: false,
        positionVersion: state.positionVersion + 1,
      })
      if (state.gameMode === 'research') void get().evaluatePosition()
      if (gameStatus === 'active' && !game.isGameOver()) {
        if (isAiTurn(game, state.playerSide)) void get().getAIMove()
      }
      return true
    } catch {
      return false
    }
  },

  loadPgn: (pgnText) => {
    try {
      const game = new Chess()
      game.loadPgn(pgnText)
      const startFen = game.header().FEN ?? START_FEN
      return get().loadPosition(startFen, game.history())
    } catch {
      return false
    }
  },

  getAIMove: async () => {
    const initial = get()
    if (
      initial.gameStatus !== 'active' ||
      initial.isThinking ||
      initial.game.isGameOver() ||
      initial.currentMoveIndex !== initial.fullGamePgn.length - 1 ||
      !isAiTurn(initial.game, initial.playerSide)
    ) {
      return
    }

    const version = initial.positionVersion
    const game = replayGame(initial.startFen, initial.fullGamePgn)
    set({ isThinking: true, error: null, errorIsAiMove: false })

    try {
      const response = await apiService.getMove({
        fen: game.fen(),
        pgn: game.history(),
        engine: initial.selectedEngine.type,
        model: initial.selectedEngine.model,
        temperature: initial.temperature,
      })

      if (get().positionVersion !== version) return
      const current = get()
      const mover: ClockSide = game.turn() === 'w' ? 'white' : 'black'
      const now = Date.now()
      let nextClock = current.clock
      if (clockIsActive(current.gameMode, current.timeFormat)) {
        const beforeMove = tickClockState(current.clock, game.turn(), now)
        if (beforeMove[mover] === 0) {
          set((state) => ({
            clock: { ...beforeMove, runningSince: null },
            gameState: {
              ...state.gameState,
              isGameOver: true,
              result: `${mover === 'white' ? 'White' : 'Black'} loses on time`,
            },
            gameStatus: 'finished',
            isThinking: false,
            positionVersion: state.positionVersion + 1,
          }))
          return
        }
        nextClock = applyClockMove(beforeMove, mover, now, incrementFor(current.timeFormat))
      }

      const moveResult = game.move(response.move)
      const moves = game.history()
      const isGameOver = game.isGameOver()
      const resultText = isGameOver ? gameResult(game) : null
      const moveNumber = Math.ceil(moves.length / 2)
      const message: CommentaryMessage = {
        engineName: `${initial.selectedEngine.type}${initial.selectedEngine.model ? ` (${initial.selectedEngine.model})` : ''}`,
        moveNumber: moveResult.color === 'w' ? `${moveNumber}.` : `${moveNumber}...`,
        moveSequence: moveResult.san,
        commentary: response.thoughts || response.raw_response || 'No thoughts provided',
        fen: game.fen(),
        rawResponse: response.raw_response,
        move: moveResult.san,
        reviewed: false,
      }

      set({
        game,
        gameState: {
          fen: game.fen(),
          pgn: moves,
          turn: game.turn(),
          isGameOver,
          result: resultText,
        },
        gameStatus: isGameOver ? 'finished' : 'active',
        fullGamePgn: moves,
        currentMoveIndex: moves.length - 1,
        commentaryHistory: [...current.commentaryHistory, message],
        clock: isGameOver ? { ...nextClock, runningSince: null } : nextClock,
        isThinking: false,
        evaluation: null,
        error: null,
        errorIsAiMove: false,
        positionVersion: version + 1,
      })
      if (current.gameMode === 'research') void get().evaluatePosition()
    } catch (error) {
      if (get().positionVersion === version) {
        console.error('AI move request failed:', error)
        set({
          error: describeApiError(error),
          errorIsAiMove: true,
        })
      }
    } finally {
      if (get().positionVersion === version && get().isThinking) set({ isThinking: false })
    }
  },

  retryAIMove: async () => {
    set({ error: null, errorIsAiMove: false })
    await get().getAIMove()
  },

  evaluatePosition: async () => {
    const initial = get()
    if (initial.gameMode !== 'research') {
      set({ evaluation: null })
      return
    }
    if (initial.game.isGameOver()) {
      const isCheckmate = initial.game.isCheckmate()
      const score = isCheckmate ? initial.game.turn() === 'w' ? -1000 : 1000 : 0
      set({ evaluation: { score, mate: isCheckmate ? 0 : null } })
      return
    }
    const version = initial.positionVersion
    try {
      const response = await apiService.evaluatePosition({ fen: initial.game.fen() })
      if (get().positionVersion === version && get().gameMode === 'research') {
        set({ evaluation: { score: response.evaluation, mate: response.mate ?? null } })
      }
    } catch (error) {
      if (get().positionVersion === version) {
        console.error('Position evaluation failed:', error)
        set({
          evaluation: null,
          error: describeApiError(error),
          errorIsAiMove: false,
        })
      }
    }
  },

  tickClock: () => {
    const state = get()
    if (
      !clockIsActive(state.gameMode, state.timeFormat) ||
      state.gameStatus !== 'active' ||
      state.clock.runningSince === null
    ) {
      return
    }
    const startingTurn = state.startFen.split(' ')[1] === 'b' ? 'b' : 'w'
    const turn = sideToMoveAfter(startingTurn, state.fullGamePgn.length)
    const clock = tickClockState(state.clock, turn, Date.now())
    const side: ClockSide = turn === 'w' ? 'white' : 'black'
    if (clock[side] === 0) {
      set({
        clock: { ...clock, runningSince: null },
        gameState: {
          ...state.gameState,
          isGameOver: true,
          result: `${side === 'white' ? 'White' : 'Black'} loses on time`,
        },
        gameStatus: 'finished',
        isThinking: false,
        positionVersion: state.positionVersion + 1,
      })
      return
    }
    set({ clock })
  },

  dismissError: () => set({ error: null, errorIsAiMove: false }),

  addCommentaryMessage: (message) =>
    set((state) => ({ commentaryHistory: [...state.commentaryHistory, message] })),

  markCommentaryReviewed: (index) =>
    set((state) => ({
      commentaryHistory: state.commentaryHistory.map((message, currentIndex) =>
        currentIndex === index ? { ...message, reviewed: true } : message,
      ),
    })),

  goToMove: (moveIndex) => {
    const state = get()
    if (state.isThinking) return
    const clampedIndex = Math.max(-1, Math.min(moveIndex, state.fullGamePgn.length - 1))
    try {
      const moves = state.fullGamePgn.slice(0, clampedIndex + 1)
      const game = replayGame(state.startFen, moves)
      set({
        game,
        gameState: gameStateFor(game, moves),
        currentMoveIndex: clampedIndex,
        evaluation: null,
        error: null,
        errorIsAiMove: false,
        positionVersion: state.positionVersion + 1,
      })
      if (state.gameMode === 'research') void get().evaluatePosition()
    } catch {
      return
    }
  },

  goToNextMove: () => get().goToMove(get().currentMoveIndex + 1),
  goToPreviousMove: () => get().goToMove(get().currentMoveIndex - 1),
  goToStart: () => get().goToMove(-1),
  goToEnd: () => get().goToMove(get().fullGamePgn.length - 1),

  continueFromHere: () => {
    const state = get()
    if (state.isThinking) return
    const moves = state.fullGamePgn.slice(0, state.currentMoveIndex + 1)
    try {
      const game = replayGame(state.startFen, moves)
      const isGameOver = game.isGameOver()
      const gameStatus = isGameOver ? 'finished' : 'active'
      set({
        game,
        gameState: gameStateFor(game, moves),
        fullGamePgn: moves,
        currentMoveIndex: moves.length - 1,
        gameStatus,
        evaluation: null,
        error: null,
        errorIsAiMove: false,
        positionVersion: state.positionVersion + 1,
      })
      if (!isGameOver) {
        if (state.gameMode === 'research') void get().evaluatePosition()
        if (isAiTurn(game, state.playerSide)) void get().getAIMove()
      }
    } catch {
      return
    }
  },
}))
