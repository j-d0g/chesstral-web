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
  selectedEngine: EngineConfig
  playerSide: 'white' | 'black'
  isThinking: boolean
  evaluation: number | null
  commentaryHistory: CommentaryMessage[]
  temperature: number
  
  // Actions
  makeHumanMove: (move: any) => Promise<boolean>
  resetGame: () => void
  setEngine: (engine: EngineConfig) => void
  setPlayerSide: (side: 'white' | 'black') => void
  setTemperature: (temp: number) => void
  loadPosition: (fen: string, pgn?: string[]) => void
  getAIMove: () => Promise<void>
  evaluatePosition: () => Promise<void>
  addCommentaryMessage: (message: CommentaryMessage) => void
  markCommentaryReviewed: (index: number) => void
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
  selectedEngine: {
    type: 'openai',
    model: 'o1',
  },
  playerSide: 'white',
  isThinking: false,
  evaluation: null,
  commentaryHistory: [],
  temperature: 0.01, // Default to very low temperature for best performance

  // Actions
  makeHumanMove: async (move: any) => {
    const { game, playerSide, getAIMove, evaluatePosition, addCommentaryMessage } = get()

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

      set({
        game: newGame,
        gameState: {
          fen: newGame.fen(),
          pgn: newGame.history(),
          turn: newGame.turn(),
          isGameOver: newGame.isGameOver(),
          result: newGame.isGameOver() ? getGameResult(newGame) : null,
        },
      })

      if (!newGame.isGameOver()) {
        await getAIMove()
      }
      
      await evaluatePosition()

      return true
    } catch (error) {
      console.error('Error making move:', error)
      // No need to revert, as we're using a copy. The original state is preserved until set() is called.
      return false
    }
  },

  resetGame: () => {
    console.log('Resetting game...')
    const newGame = new Chess()
    const { playerSide, getAIMove } = get()
    
    set({
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
    })
    
    // If player is black, AI should make the first move
    if (playerSide === 'black') {
      setTimeout(() => {
        getAIMove()
      }, 500)
    }
  },

  setEngine: (engine: EngineConfig) => {
    console.log('Setting engine:', engine)
    const { game, playerSide, getAIMove } = get()
    
    // If switching to NanoGPT and player is currently White, force them to Black
    if (engine.type === 'nanogpt' && playerSide === 'white') {
      console.log('NanoGPT selected - forcing player to Black side')
      set({ 
        selectedEngine: engine,
        playerSide: 'black'
      })
      
      // If it's the start of the game (White's turn), AI should make the first move
      if (game.turn() === 'w') {
        setTimeout(() => {
          getAIMove()
        }, 500)
      }
    } else {
      set({ selectedEngine: engine })
    }
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

      set({
        game: newGame,
        gameState: {
          fen: newGame.fen(),
          pgn: newGame.history(),
          turn: newGame.turn(),
          isGameOver: newGame.isGameOver(),
          result: newGame.isGameOver() ? getGameResult(newGame) : null,
        },
        commentaryHistory: [],
        evaluation: null,
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
    const { game, selectedEngine, temperature, addCommentaryMessage } = get()
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
        
        set({
          game: newGame,
          gameState: {
            fen: newGame.fen(),
            pgn: newGame.history(),
            turn: newGame.turn(),
            isGameOver: newGame.isGameOver(),
            result: newGame.isGameOver() ? getGameResult(newGame) : null,
          },
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