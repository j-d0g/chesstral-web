import { create } from 'zustand'
import { Chess } from 'chess.js'
import { apiService } from '../services/apiService'
import { CommentaryMessage } from '../types/CommentaryMessage'

interface GameState {
  fen: string
  pgn: string[]
  turn: 'w' | 'b'
  isGameOver: boolean
  result: string | null
}

interface EngineConfig {
  type: string
  model?: string
}

interface GameStore {
  // State
  game: Chess
  gameState: GameState
  gameMode: 'landing' | 'competitive' | 'research'
  gameStatus: 'setup' | 'active' | 'finished'
  selectedEngine: EngineConfig
  playerSide: 'white' | 'black'
  isThinking: boolean
  evaluation: number | null
  commentaryHistory: CommentaryMessage[]
  temperature: number
  
  // Move navigation state
  currentMoveIndex: number  // -1 = start position, 0 = after first move, etc.
  fullGamePgn: string[]     // Complete game PGN (never changes during navigation)
  
  // Actions
  makeHumanMove: (move: any) => Promise<boolean>
  startGame: () => void
  resetGame: () => void
  resignGame: () => void
  setGameMode: (mode: 'landing' | 'competitive' | 'research') => void
  switchSides: () => void
  setEngine: (engine: EngineConfig) => void
  setPlayerSide: (side: 'white' | 'black') => void
  setTemperature: (temp: number) => void
  loadPosition: (fen: string, pgn?: string[]) => void
  getAIMove: () => Promise<void>
  evaluatePosition: () => Promise<void>
  addCommentaryMessage: (message: CommentaryMessage) => void
  markCommentaryReviewed: (index: number) => void
  
  // Move navigation actions
  goToMove: (moveIndex: number) => void
  goToNextMove: () => void
  goToPreviousMove: () => void
  goToStart: () => void
  goToEnd: () => void
  continueFromHere: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  game: new Chess(),
  gameState: {
    fen: new Chess().fen(),
    pgn: [],
    turn: 'w',
    isGameOver: false,
    result: null,
  },
  gameMode: 'landing', // Start at landing page
  gameStatus: 'setup', // Start in setup mode
  selectedEngine: {
    type: 'nanogpt',
    model: 'small-8',
  },
  playerSide: 'black', // Default to black so NanoGPT plays white (its preferred color)
  isThinking: false,
  evaluation: null,
  commentaryHistory: [],
  temperature: 0.01, // Default to very low temperature for best performance
  
  // Move navigation state
  currentMoveIndex: -1,  // Start at beginning
  fullGamePgn: [],

  // Actions
  makeHumanMove: async (move: any) => {
    const { game, gameStatus, playerSide, getAIMove, evaluatePosition, addCommentaryMessage, currentMoveIndex, fullGamePgn } = get()

    // Only allow moves if game is active
    if (gameStatus !== 'active') {
      console.log("Cannot make moves - game is not active")
      return false
    }

    // Only allow moves if we're at the end of the game (live play mode)
    if (currentMoveIndex !== fullGamePgn.length - 1 && fullGamePgn.length > 0) {
      console.log("Cannot make moves while reviewing previous positions")
      return false
    }

    // Create a TRUE copy of the game, including history, by using PGN.
    const newGame = new Chess()
    const pgn = game.pgn()
    if (pgn) {
      newGame.loadPgn(pgn)
    }

    try {
      const isPlayersTurn =
        (newGame.turn() === 'w' && playerSide === 'white') ||
        (newGame.turn() === 'b' && playerSide === 'black')
      
      if (!isPlayersTurn) {
        console.log("Not player's turn")
        return false
      }

      const moveResult = newGame.move(move)
      
      if (!moveResult) {
        console.log('Invalid move')
        return false
      }

      const moveNumber = Math.ceil(newGame.history().length / 2)
      const isWhiteMove = moveResult.color === 'w'
      addCommentaryMessage({
        engineName: 'You',
        moveNumber: isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`,
        moveSequence: moveResult.san,
        commentary: '',
        fen: newGame.fen(),
        move: moveResult.san,
        reviewed: false,
      })

      const newPgn = newGame.history()
      
      set({
        game: newGame,
        gameState: {
          fen: newGame.fen(),
          pgn: newPgn,
          turn: newGame.turn(),
          isGameOver: newGame.isGameOver(),
          result: newGame.isGameOver() ? getGameResult(newGame) : null,
        },
        fullGamePgn: newPgn,
        currentMoveIndex: newPgn.length - 1,
      })

      if (!newGame.isGameOver()) {
        await getAIMove()
      } else {
        // Game is over, set status to finished
        set({ gameStatus: 'finished' })
      }
      
      await evaluatePosition()

      return true
    } catch (error) {
      console.error('Error making move:', error)
      // No need to revert, as we're using a copy. The original state is preserved until set() is called.
      return false
    }
  },

  startGame: () => {
    console.log('Starting new game...')
    const { playerSide, getAIMove } = get()
    const newGame = new Chess()
    
    set({
      game: newGame,
      gameState: {
        fen: newGame.fen(),
        pgn: [],
        turn: 'w',
        isGameOver: false,
        result: null,
      },
      gameStatus: 'active',
      isThinking: false,
      evaluation: null,
      commentaryHistory: [],
      currentMoveIndex: -1,
      fullGamePgn: [],
    })
    
    // If AI plays white (player is black), AI should make the first move
    if (playerSide === 'black') {
      setTimeout(() => {
        getAIMove()
      }, 500)
    }
  },

  resetGame: () => {
    const { gameMode } = get()
    console.log('Resetting game...')
    const newGame = new Chess()
    
    if (gameMode === 'competitive') {
      // Go back to setup for competitive mode
      set({
        game: newGame,
        gameState: {
          fen: newGame.fen(),
          pgn: [],
          turn: 'w',
          isGameOver: false,
          result: null,
        },
        gameStatus: 'setup',
        isThinking: false,
        evaluation: null,
        commentaryHistory: [],
        currentMoveIndex: -1,
        fullGamePgn: [],
      })
    } else {
      // Go back to landing page for other modes
      set({
        gameMode: 'landing',
        game: newGame,
        gameState: {
          fen: newGame.fen(),
          pgn: [],
          turn: 'w',
          isGameOver: false,
          result: null,
        },
        gameStatus: 'setup',
        isThinking: false,
        evaluation: null,
        commentaryHistory: [],
        currentMoveIndex: -1,
        fullGamePgn: [],
      })
    }
  },

  setGameMode: (mode: 'landing' | 'competitive' | 'research') => {
    console.log('Setting game mode:', mode)
    set({ gameMode: mode })
    
    // If entering research mode, start immediately in active state
    if (mode === 'research') {
      const { playerSide, getAIMove } = get()
      const newGame = new Chess()
      
      set({
        gameStatus: 'active',
        game: newGame,
        gameState: {
          fen: newGame.fen(),
          pgn: [],
          turn: 'w',
          isGameOver: false,
          result: null,
        },
        isThinking: false,
        evaluation: null,
        commentaryHistory: [],
        currentMoveIndex: -1,
        fullGamePgn: [],
      })
      
      // If AI plays white (player is black), AI should make the first move
      if (playerSide === 'black') {
        setTimeout(() => {
          getAIMove()
        }, 500)
      }
    }
    // If entering competitive mode, go to setup
    else if (mode === 'competitive') {
      set({ gameStatus: 'setup' })
    }
  },

  switchSides: () => {
    const { playerSide, gameMode, game, getAIMove } = get()
    
    // Only allow in research mode
    if (gameMode !== 'research') {
      console.log('Side switching only available in research mode')
      return
    }
    
    const newSide = playerSide === 'white' ? 'black' : 'white'
    console.log(`Switching sides from ${playerSide} to ${newSide}`)
    
    set({ playerSide: newSide })
    
    // If it's now the AI's turn and game isn't over, get AI move
    const isNowAITurn = 
      (game.turn() === 'w' && newSide === 'black') ||
      (game.turn() === 'b' && newSide === 'white')
    
    if (!game.isGameOver() && isNowAITurn) {
      setTimeout(() => {
        getAIMove()
      }, 500)
    }
  },

  setEngine: (engine: EngineConfig) => {
    console.log('Setting engine:', engine)
    set({ selectedEngine: engine })
  },

  setPlayerSide: (side: 'white' | 'black') => {
    console.log(`Attempting to set player side to: ${side}`)
    const { playerSide: currentSide, resetGame } = get()

    // Only reset the game if the side is actually changing
    if (side !== currentSide) {
      console.log(`Side changed from ${currentSide} to ${side}. Resetting game.`)
      set({ playerSide: side })
      resetGame()
    } else {
      console.log(`Side is already ${side}. No reset needed.`)
    }
  },

  setTemperature: (temp: number) => {
    console.log('Setting temperature:', temp)
    set({ temperature: temp })
  },

  loadPosition: (fen: string, pgn?: string[]) => {
    try {
      // Create a new game instance from the provided FEN
      const newGame = new Chess()
      newGame.load(fen)

      // If PGN is provided, load it. This is more robust.
      if (pgn && pgn.length > 0) {
        newGame.loadPgn(pgn.join(' '))
      }

      const newPgn = newGame.history()
      
      set({
        game: newGame,
        gameState: {
          fen: newGame.fen(),
          pgn: newPgn,
          turn: newGame.turn(),
          isGameOver: newGame.isGameOver(),
          result: newGame.isGameOver() ? getGameResult(newGame) : null,
        },
        commentaryHistory: [],
        evaluation: null,
        fullGamePgn: newPgn,
        currentMoveIndex: newPgn.length - 1,
      })
      
      console.log(`Position loaded: ${newGame.history().length} moves, FEN: ${fen.substring(0, 50)}...`)
      
      // Evaluate the new position
      get().evaluatePosition()
    } catch (error) {
      console.error('Failed to load FEN/PGN:', error)
      alert('Invalid FEN or PGN string. Please check and try again.')
    }
  },

  getAIMove: async () => {
    const { game, gameStatus, selectedEngine, temperature, addCommentaryMessage, currentMoveIndex, fullGamePgn } = get()
    
    // Only allow AI moves if game is active
    if (gameStatus !== 'active') {
      console.log("Cannot get AI move - game is not active")
      return
    }
    
    // Only allow AI moves if we're at the end of the game (live play mode)
    if (currentMoveIndex !== fullGamePgn.length - 1 && fullGamePgn.length > 0) {
      console.log("Cannot get AI move while reviewing previous positions")
      return
    }
    
    if (game.isGameOver()) return

    set({ isThinking: true })

    try {
      const response = await apiService.getMove({
        fen: game.fen(),
        pgn: game.history(),
        engine: selectedEngine.type,
        model: selectedEngine.model,
        temperature: temperature,
      })

      // Create a TRUE copy of the game to apply the AI's move to.
      const newGame = new Chess()
      const pgn = game.pgn()
      if (pgn) {
        newGame.loadPgn(pgn)
      }
      
      const moveResult = newGame.move(response.move)

      if (moveResult) {
        const moveNumber = Math.ceil(newGame.history().length / 2)
        const isWhiteMove = moveResult.color === 'w'

        addCommentaryMessage({
          engineName: `${selectedEngine.type}${selectedEngine.model ? ` (${selectedEngine.model})` : ''}`,
          moveNumber: isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`,
          moveSequence: moveResult.san,
          commentary: response.thoughts || response.raw_response || 'No thoughts provided',
          fen: newGame.fen(),
          rawResponse: response.raw_response,
          move: moveResult.san,
          reviewed: false,
        })
        
        const newPgn = newGame.history()
        
        set({
          game: newGame,
          gameState: {
            fen: newGame.fen(),
            pgn: newPgn,
            turn: newGame.turn(),
            isGameOver: newGame.isGameOver(),
            result: newGame.isGameOver() ? getGameResult(newGame) : null,
          },
          gameStatus: newGame.isGameOver() ? 'finished' : 'active',
          fullGamePgn: newPgn,
          currentMoveIndex: newPgn.length - 1,
        })
      } else {
        throw new Error(`Invalid move from AI: ${response.move}`)
      }
    } catch (error) {
      console.error('Error getting AI move:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(`AI failed to make a move: ${errorMessage}`)
    } finally {
      set({ isThinking: false })
      get().evaluatePosition()
    }
  },

  evaluatePosition: async () => {
    const { game } = get()
    if (game.isGameOver()) {
      set({ evaluation: null })
      return
    }
    try {
      const response = await apiService.evaluatePosition({ fen: game.fen() })
      set({ evaluation: response.evaluation })
    } catch (error) {
      console.error('Error evaluating position:', error)
      set({ evaluation: null })
    }
  },

  addCommentaryMessage: (message: CommentaryMessage) => {
    set(state => ({
      commentaryHistory: [...state.commentaryHistory, message],
    }))
  },

  markCommentaryReviewed: (index: number) => {
    set(state => {
      const newHistory = [...state.commentaryHistory]
      if (newHistory[index]) {
        newHistory[index].reviewed = true
      }
      return { commentaryHistory: newHistory }
    })
  },

  // Move navigation actions
  goToMove: (moveIndex: number) => {
    const { fullGamePgn } = get()
    
    // Clamp moveIndex to valid range
    const clampedIndex = Math.max(-1, Math.min(moveIndex, fullGamePgn.length - 1))
    
    try {
      const newGame = new Chess()
      
      if (clampedIndex >= 0) {
        // Play moves up to the specified index
        const movesToPlay = fullGamePgn.slice(0, clampedIndex + 1)
        for (const move of movesToPlay) {
          newGame.move(move)
        }
      }
      
      set({
        game: newGame,
        gameState: {
          fen: newGame.fen(),
          pgn: newGame.history(),
          turn: newGame.turn(),
          isGameOver: newGame.isGameOver(),
          result: newGame.isGameOver() ? getGameResult(newGame) : null,
        },
        currentMoveIndex: clampedIndex,
      })
      
      get().evaluatePosition()
    } catch (error) {
      console.error('Error navigating to move:', error)
    }
  },

  goToNextMove: () => {
    const { currentMoveIndex, fullGamePgn } = get()
    if (currentMoveIndex < fullGamePgn.length - 1) {
      get().goToMove(currentMoveIndex + 1)
    }
  },

  goToPreviousMove: () => {
    const { currentMoveIndex } = get()
    if (currentMoveIndex > -1) {
      get().goToMove(currentMoveIndex - 1)
    }
  },

  goToStart: () => {
    get().goToMove(-1)
  },

  goToEnd: () => {
    const { fullGamePgn } = get()
    get().goToMove(fullGamePgn.length - 1)
  },

  continueFromHere: () => {
    const { currentMoveIndex, fullGamePgn, game, playerSide, getAIMove } = get()
    
    // If already at the end, no need to continue
    if (currentMoveIndex === fullGamePgn.length - 1) {
      return
    }
    
    // Truncate the game history at the current position
    const newPgn = currentMoveIndex >= 0 ? fullGamePgn.slice(0, currentMoveIndex + 1) : []
    
    // Update the full game PGN to the truncated version
    set({
      fullGamePgn: newPgn,
      currentMoveIndex: newPgn.length - 1,
      gameState: {
        fen: game.fen(),
        pgn: game.history(),
        turn: game.turn(),
        isGameOver: game.isGameOver(),
        result: game.isGameOver() ? getGameResult(game) : null,
      },
    })
    
    console.log(`Continuing from move ${currentMoveIndex + 1}. Game truncated to ${newPgn.length} moves.`)
    
    // If it's the AI's turn and the game isn't over, get AI move
    const isPlayersTurn = 
      (game.turn() === 'w' && playerSide === 'white') ||
      (game.turn() === 'b' && playerSide === 'black')
    
    if (!game.isGameOver() && !isPlayersTurn) {
      setTimeout(() => {
        getAIMove()
      }, 500)
    }
  },

  resignGame: () => {
    const { playerSide, game } = get()
    console.log('Player resigned')
    
    // Create a copy of the game and set it as finished with resignation result
    const newGame = new Chess()
    const pgn = game.pgn()
    if (pgn) {
      newGame.loadPgn(pgn)
    }
    
    // Determine result based on who resigned
    const result = playerSide === 'white' ? '0-1 (White resigned)' : '1-0 (Black resigned)'
    
    set({
      game: newGame,
      gameState: {
        fen: newGame.fen(),
        pgn: newGame.history(),
        turn: newGame.turn(),
        isGameOver: true,
        result: result,
      },
      gameStatus: 'finished',
      isThinking: false,
    })
  },
}))

function getGameResult(game: Chess): string {
  if (game.isCheckmate()) {
    return game.turn() === 'b' ? 'White wins by checkmate' : 'Black wins by checkmate'
  }
  if (game.isDraw()) {
    if (game.isStalemate()) return 'Draw by stalemate'
    if (game.isThreefoldRepetition()) return 'Draw by threefold repetition'
    if (game.isInsufficientMaterial()) return 'Draw by insufficient material'
    return 'Draw by 50-move rule'
  }
  return 'Game over'
} 