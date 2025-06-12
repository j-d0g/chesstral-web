import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { useGameStore } from '../store/gameStore'
import EngineSelector from './EngineSelector'
import GameControls from './GameControls'
import MoveHistory from './MoveHistory'
import EvaluationBar from './EvaluationBar'
import PositionInput from './PositionInput'
import CommentaryBox from './CommentaryBox'
import TemperatureControl from './TemperatureControl'

const ChessGame: React.FC = () => {
  const {
    gameState,
    selectedEngine,
    playerSide,
    isThinking,
    evaluation,
    commentaryHistory,
    makeHumanMove,
    resetGame,
    setEngine,
    setPlayerSide,
    loadPosition,
    markCommentaryReviewed
  } = useGameStore()

  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const [activeTab, setActiveTab] = useState<'moves' | 'analysis' | 'commentary' | 'settings'>('moves')
  const commentaryBoxRef = useRef<HTMLDivElement>(null)

  // Check if the selected engine constrains player side
  const isNanoGPT = selectedEngine.type === 'nanogpt'

  // Effect to enforce side constraints when engine changes
  useEffect(() => {
    if (isNanoGPT && playerSide === 'white') {
      setPlayerSide('black')
      setBoardOrientation('black')
    } else if (isNanoGPT) {
      // Even if already black, ensure board is oriented correctly
      setBoardOrientation('black')
    }
  }, [selectedEngine.type, playerSide, setPlayerSide, isNanoGPT])

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string) => {
      const move = {
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      }

      // Make the move - the store will handle validation and rollback if needed
      makeHumanMove(move).then(result => {
        if (!result) {
          console.log('Move was invalid or rejected')
          // The store has already rolled back the move
        }
      }).catch(error => {
        console.error('Error making move:', error)
      })
      
      // Return true to allow immediate visual feedback
      return true
    },
    [makeHumanMove]
  )

  const handleSideChange = (side: 'white' | 'black') => {
    if (isNanoGPT && side === 'white') return
    setPlayerSide(side)
    setBoardOrientation(side)
  }

  const handleFlipBoard = () => {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')
  }

  const handleRatingSubmit = (index: number) => {
    markCommentaryReviewed(index)
  }

  const currentTurn = gameState.turn === 'w' ? 'White' : 'Black'
  const isPlayersTurn = (gameState.turn === 'w' && playerSide === 'white') || 
                       (gameState.turn === 'b' && playerSide === 'black')

  return (
    <div className="chess-game-layout">
      {/* Top Control Bar */}
      <div className="top-bar">
        <div className="game-info">
          <div className="players">
            <div className={`player ${playerSide === 'white' ? 'active' : ''}`}>
              <span className="player-icon">🔵</span>
              {playerSide === 'white' && <span>You</span>}
              {gameState.turn === 'w' && <span className="turn-indicator">●</span>}
            </div>
            <div className="vs-separator">vs</div>
            <div className={`player ${playerSide === 'black' ? 'active' : ''}`}>
              <span className="player-icon">⚫</span>
              {playerSide === 'black' && <span>You</span>}
              {gameState.turn === 'b' && <span className="turn-indicator">●</span>}
            </div>
          </div>
          
          <div className="engine-info">
            <strong>{selectedEngine.type}</strong>
            {selectedEngine.model && <span className="model">({selectedEngine.model})</span>}
            {isThinking && <span className="thinking-indicator">🤔</span>}
          </div>
        </div>

        <div className="top-controls">
        <EngineSelector 
          selectedEngine={selectedEngine}
          onEngineChange={setEngine}
        />
          
          <div className="side-toggle">
            <button 
              className={`side-btn ${playerSide === 'white' ? 'active' : ''} ${isNanoGPT ? 'disabled' : ''}`}
              onClick={() => handleSideChange('white')}
              disabled={isNanoGPT}
            >
              🔵
            </button>
            <button 
              className={`side-btn ${playerSide === 'black' ? 'active' : ''}`}
              onClick={() => handleSideChange('black')}
            >
              ⚫
            </button>
          </div>
        
        <GameControls
          onNewGame={resetGame}
          onFlipBoard={handleFlipBoard}
          isThinking={isThinking}
        />
        </div>
      </div>

      {/* Main Game Area */}
      <div className="game-main">
        {/* Board Section */}
        <div className="board-section">
          <div className="board-container">
          <Chessboard
            position={gameState.fen}
            onPieceDrop={onDrop}
            boardOrientation={boardOrientation}
            arePiecesDraggable={!isThinking && !gameState.isGameOver && isPlayersTurn}
            customBoardStyle={{
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
            customDarkSquareStyle={{ backgroundColor: '#779952' }}
            customLightSquareStyle={{ backgroundColor: '#edeed1' }}
              customDropSquareStyle={{
                boxShadow: 'inset 0 0 1px 6px rgba(255,255,255,0.75)'
              }}
              boardWidth={500}
            />
          </div>

          {/* Game Status */}
          <div className="game-status-bar">
            {gameState.isGameOver ? (
              <div className="game-over-status">
                🏁 {gameState.result}
              </div>
            ) : (
              <div className="current-status">
                <span>Turn: <strong>{currentTurn}</strong></span>
                <span>•</span>
                <span>{isPlayersTurn ? "Your turn" : "AI thinking..."}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          {/* Tab Navigation */}
          <div className="tab-nav">
            <button 
              className={`tab ${activeTab === 'moves' ? 'active' : ''}`}
              onClick={() => setActiveTab('moves')}
            >
              Moves
            </button>
            <button 
              className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              Analysis
            </button>
            <button 
              className={`tab ${activeTab === 'commentary' ? 'active' : ''}`}
              onClick={() => setActiveTab('commentary')}
            >
              AI Thoughts
            </button>
            <button 
              className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'moves' && (
              <div className="moves-tab">
                <MoveHistory moves={gameState.pgn} />
                <div className="position-input-section">
                  <PositionInput onLoadPosition={loadPosition} />
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="analysis-tab">
                <EvaluationBar evaluation={evaluation} />
                <div className="analysis-info">
                  <h4>Position Analysis</h4>
                  <p>Engine evaluation and best moves will appear here.</p>
                </div>
              </div>
            )}

            {activeTab === 'commentary' && (
              <div className="commentary-tab">
                <CommentaryBox
                  commentaryBoxRef={commentaryBoxRef}
                  commentaryHistory={commentaryHistory}
                  onRatingSubmit={handleRatingSubmit}
                  uuid={`game-${Date.now()}`}
                />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="settings-tab">
                <TemperatureControl />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NanoGPT Warning */}
      {isNanoGPT && (
        <div className="nanogpt-notice">
          ⚠️ NanoGPT models only play as White. You must play as Black.
        </div>
      )}
      
      {/* Game Over Modal */}
      {gameState.isGameOver && (
        <div className="game-over-modal">
          <div className="game-over-content">
            <h2>Game Over!</h2>
            <p className="game-result">{gameState.result}</p>
            <div className="game-over-stats">
              <div className="stat">
                <span className="stat-label">Total Moves:</span>
                <span className="stat-value">{gameState.pgn.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Playing as:</span>
                <span className="stat-value">{playerSide === 'white' ? '🔵 White' : '⚫ Black'}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Against:</span>
                <span className="stat-value">{selectedEngine.type} {selectedEngine.model && `(${selectedEngine.model})`}</span>
              </div>
            </div>
            <button className="new-game-button" onClick={resetGame}>
              New Game
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChessGame 