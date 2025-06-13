import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { useGameStore } from '../store/gameStore'
import EngineSelector from './EngineSelector'
import GameControls from './GameControls'
import MoveHistory from './MoveHistory'
import EnhancedAnalysisPanel from './EnhancedAnalysisPanel'
import PositionInput from './PositionInput'
import CommentaryBox from './CommentaryBox'
import TemperatureControl from './TemperatureControl'
import MoveNavigation from './MoveNavigation'
import GameSetup from './GameSetup'
import LandingPage from './LandingPage'
import Timer from './Timer'
import EvaluationBar from './EvaluationBar'

const ChessGame: React.FC = () => {
  const {
    gameState,
    currentMoveIndex,
    gameMode,
    gameStatus,
    evaluation,
    isThinking,
    selectedEngine,
    playerSide,
    temperature,
    timeFormat,
    commentaryHistory,
    goToPreviousMove,
    goToNextMove,
    makeHumanMove,
    setEngine,
    setPlayerSide,
    setTemperature,
    switchSides,
    resetGame,
    resignGame,
    goToMove,
    loadPosition,
    markCommentaryReviewed
  } = useGameStore()

  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const [activeTab, setActiveTab] = useState<'moves' | 'analysis' | 'commentary' | 'settings'>('moves')
  const commentaryBoxRef = useRef<HTMLDivElement>(null)

  // Check if the selected engine constrains player side
  const isNanoGPT = selectedEngine.type === 'nanogpt'
  const isCompetitive = gameMode === 'competitive'

  // Remove the automatic side enforcement for NanoGPT - let users choose but show warning
  useEffect(() => {
    // Set board orientation to match player side
    setBoardOrientation(playerSide)
  }, [playerSide])

  // Available tabs based on game mode
  const availableTabs = isCompetitive 
    ? ['moves'] as const
    : ['moves', 'analysis', 'commentary', 'settings'] as const

  // Ensure active tab is available in current mode
  useEffect(() => {
    if (!availableTabs.includes(activeTab as any)) {
      setActiveTab('moves')
    }
  }, [gameMode, activeTab, availableTabs])

  // Global keyboard navigation (works on any tab)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPreviousMove()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goToNextMove()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [goToPreviousMove, goToNextMove])

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
    setPlayerSide(side)
    setBoardOrientation(side)
  }

  const handleFlipBoard = () => {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')
  }

  const handleRatingSubmit = (index: number) => {
    markCommentaryReviewed(index)
  }

  const handleResign = () => {
    if (window.confirm('Are you sure you want to resign this game?')) {
      resignGame()
    }
  }

  const currentTurn = gameState.turn === 'w' ? 'White' : 'Black'
  const isPlayersTurn = (gameState.turn === 'w' && playerSide === 'white') || 
                       (gameState.turn === 'b' && playerSide === 'black')

  // Show landing page
  if (gameMode === 'landing') {
    return <LandingPage />
  }

  // Show setup screen for competitive mode
  if (gameMode === 'competitive' && gameStatus === 'setup') {
    return <GameSetup />
  }

  // Show setup screen for research mode if needed
  if (gameMode === 'research' && gameStatus === 'setup') {
    return <GameSetup />
  }

  // Debug logging for blank page issue
  console.log('ChessGame render state:', {
    gameMode,
    gameStatus,
    isCompetitive,
    gameState,
    selectedEngine,
    playerSide
  })

  // Fallback for unexpected states
  if (!gameState || !selectedEngine) {
    return (
      <div className="chess-game-layout">
        <div className="loading-state">
          <h2>Loading game...</h2>
          <p>Game Mode: {gameMode}</p>
          <p>Game Status: {gameStatus}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`chess-game-layout ${isCompetitive ? 'competitive-mode' : 'research-mode'}`}>
      {/* Top Control Bar */}
      <div className="top-bar">
        <div className="game-info">
          <div className="players">
            <div className={`player ${playerSide === 'white' ? 'active' : ''}`}>
              <span className="player-icon">⚪</span>
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
          {/* Only show engine selector in research mode */}
          {!isCompetitive && (
        <EngineSelector 
          selectedEngine={selectedEngine}
          onEngineChange={setEngine}
        />
          )}
          
          <div className="side-toggle">
            {gameMode === 'research' ? (
            <button 
                className="switch-sides-btn"
                onClick={switchSides}
                disabled={isThinking}
                title="Switch sides with the AI"
            >
                🔄 Switch Sides
            </button>
            ) : (
              // In competitive mode, show cleaner display without duplication
              <div className="competitive-info">
                <span className="match-type">Competitive Match</span>
              </div>
            )}
          </div>
        
        <GameControls
          onNewGame={resetGame}
          onFlipBoard={handleFlipBoard}
          isThinking={isThinking}
            showResign={isCompetitive}
            onResign={handleResign}
        />
        </div>
      </div>

      {/* Main Game Area */}
      <div className="game-main">
        {/* Board Section */}
        <div className="game-board-section">
          <div className="board-container">
          <Chessboard
            position={gameState.fen}
            onPieceDrop={onDrop}
            boardOrientation={boardOrientation}
            arePiecesDraggable={!isThinking && !gameState.isGameOver && isPlayersTurn}
              boardWidth={500}
            customBoardStyle={{
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
            }}
            customDarkSquareStyle={{ backgroundColor: '#779952' }}
            customLightSquareStyle={{ backgroundColor: '#edeed1' }}
              customDropSquareStyle={{
                boxShadow: 'inset 0 0 1px 6px rgba(255,255,255,0.75)'
              }}
            />

            {/* Timer - only show in competitive mode */}
            {isCompetitive && (
              <Timer timeFormat={timeFormat} />
            )}
          </div>
          
          {/* Evaluation Bar - show in research mode next to board */}
          {!isCompetitive && (
            <div className="evaluation-section">
              <EvaluationBar evaluation={evaluation} />
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          {/* Tab Navigation */}
          <div className="tab-nav">
            {availableTabs.map(tab => (
            <button 
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
            >
                {tab === 'moves' && 'Moves'}
                {tab === 'analysis' && 'Analysis'}
                {tab === 'commentary' && 'AI Thoughts'}
                {tab === 'settings' && 'Settings'}
            </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'moves' && (
              <div className="moves-tab">
                <MoveNavigation />
                <MoveHistory moves={gameState.pgn} />
                {/* Only show position input in research mode */}
                {!isCompetitive && (
                <div className="position-input-section">
                  <PositionInput onLoadPosition={loadPosition} />
                </div>
                )}
              </div>
            )}

            {activeTab === 'analysis' && !isCompetitive && (
              <div className="analysis-tab">
                <EnhancedAnalysisPanel />
              </div>
            )}

            {activeTab === 'commentary' && !isCompetitive && (
              <div className="commentary-tab">
                <CommentaryBox
                  commentaryBoxRef={commentaryBoxRef}
                  commentaryHistory={commentaryHistory}
                  onRatingSubmit={handleRatingSubmit}
                  uuid={`game-${Date.now()}`}
                />
              </div>
            )}

            {activeTab === 'settings' && !isCompetitive && (
              <div className="settings-tab">
                <TemperatureControl />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NanoGPT Performance Warning - Updated */}
      {isNanoGPT && playerSide === 'white' && (
        <div className="nanogpt-notice">
          ⚠️ <strong>Performance Notice:</strong> NanoGPT was trained to play as White and performs best in that role. 
          When you play as White (forcing NanoGPT to play as Black), its performance will be significantly reduced.
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
            <div className="game-over-actions">
            <button className="new-game-button" onClick={resetGame}>
              New Game
            </button>
              {isCompetitive && (
                <button className="rematch-button" onClick={() => {
                  // Switch sides and start new game
                  setPlayerSide(playerSide === 'white' ? 'black' : 'white')
                  resetGame()
                }}>
                  🔄 Rematch (Switch Sides)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChessGame 