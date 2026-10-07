/**
 * MoveNavigation.tsx - Move Navigation Controls
 * 
 * PURPOSE: Navigate through game moves with arrow keys and buttons
 * FEATURES: Previous/Next move, Go to start/end, keyboard shortcuts
 */

import React, { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

const MoveNavigation: React.FC = () => {
  const {
    gameMode,
    isThinking,
    currentMoveIndex,
    fullGamePgn,
    goToMove,
    goToNextMove,
    goToPreviousMove,
    goToStart,
    goToEnd,
    continueFromHere,
  } = useGameStore()

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          goToPreviousMove()
          break
        case 'ArrowRight':
          event.preventDefault()
          goToNextMove()
          break
        case 'Home':
          event.preventDefault()
          goToStart()
          break
        case 'End':
          event.preventDefault()
          goToEnd()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPreviousMove, goToNextMove, goToStart, goToEnd])

  const isAtStart = currentMoveIndex === -1
  const isAtEnd = currentMoveIndex === fullGamePgn.length - 1
  const totalMoves = fullGamePgn.length
  const canContinueFromHere = !isAtEnd && totalMoves > 0
  const isCompetitive = gameMode === 'competitive'

  return (
    <div className="move-navigation">
      <div className="move-controls">
        <button 
          onClick={goToStart}
          disabled={isThinking || isAtStart}
          className="nav-btn"
          title="Go to start (Home)"
        >
          ⏮️
        </button>
        
        <button 
          onClick={goToPreviousMove}
          disabled={isThinking || isAtStart}
          className="nav-btn"
          title="Previous move (←)"
        >
          ⬅️
        </button>
        
        <span className="move-counter">
          {currentMoveIndex + 1} / {totalMoves || 1}
        </span>
        
        <button 
          onClick={goToNextMove}
          disabled={isThinking || isAtEnd || totalMoves === 0}
          className="nav-btn"
          title="Next move (→)"
        >
          ➡️
        </button>
        
        <button 
          onClick={goToEnd}
          disabled={isThinking || isAtEnd || totalMoves === 0}
          className="nav-btn"
          title="Go to end (End)"
        >
          ⏭️
        </button>
      </div>
      
      {totalMoves > 0 && (
        <div className="move-slider-container">
          <input
            type="range"
            min="-1"
            max={Math.max(0, totalMoves - 1)}
            value={currentMoveIndex}
            onChange={(e) => goToMove(parseInt(e.target.value))}
            className="move-slider"
            disabled={isThinking}
          />
        </div>
      )}
      
      {/* Only show continue from here in research mode */}
      {canContinueFromHere && !isCompetitive && (
        <div className="continue-from-here">
          <button 
            onClick={continueFromHere}
            disabled={isThinking}
            className="continue-btn"
            title="Continue playing from this position (truncates future moves)"
          >
            🎯 Continue from here
          </button>
        </div>
      )}
      
      <div className="keyboard-hints">
        <span>Use ← → arrow keys to navigate</span>
      </div>
    </div>
  )
}

export default MoveNavigation 