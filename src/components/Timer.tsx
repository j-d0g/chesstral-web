/**
 * Timer.tsx - Chess Game Timer
 * 
 * PURPOSE: Display and manage chess game timers for competitive mode
 * FEATURES: Countdown timers, increment support, low time warnings
 */

import React, { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

interface TimerProps {
  timeFormat: 'blitz' | 'rapid' | 'classical' | 'unlimited'
}

const Timer: React.FC<TimerProps> = ({ timeFormat }) => {
  const { gameState, playerSide, isThinking } = useGameStore()
  
  // Timer configurations (in seconds)
  const timeConfigs = {
    blitz: { initial: 180, increment: 2 }, // 3+2
    rapid: { initial: 600, increment: 5 }, // 10+5
    classical: { initial: 1800, increment: 30 }, // 30+30
    unlimited: { initial: 0, increment: 0 } // No time limit
  }
  
  const config = timeConfigs[timeFormat]
  
  // Timer state
  const [whiteTime, setWhiteTime] = useState(config.initial)
  const [blackTime, setBlackTime] = useState(config.initial)
  const [lastMoveTime, setLastMoveTime] = useState<number | null>(null)
  
  // Reset timers when game resets
  useEffect(() => {
    if (gameState.pgn.length === 0) {
      setWhiteTime(config.initial)
      setBlackTime(config.initial)
      setLastMoveTime(null)
    }
  }, [gameState.pgn.length, config.initial])
  
  // Handle move timing
  useEffect(() => {
    if (gameState.pgn.length > 0 && lastMoveTime) {
      const moveTime = Date.now() - lastMoveTime
      const timeUsed = Math.floor(moveTime / 1000)
      
      // Determine which player just moved
      const lastMoveWasWhite = gameState.pgn.length % 2 === 1
      
      if (lastMoveWasWhite) {
        setWhiteTime(prev => Math.max(0, prev - timeUsed + config.increment))
      } else {
        setBlackTime(prev => Math.max(0, prev - timeUsed + config.increment))
      }
    }
    
    // Set time for current move
    if (!gameState.isGameOver) {
      setLastMoveTime(Date.now())
    }
  }, [gameState.pgn.length, gameState.isGameOver, config.increment])
  
  // Countdown timer
  useEffect(() => {
    if (timeFormat === 'unlimited' || gameState.isGameOver || isThinking) {
      return
    }
    
    const interval = setInterval(() => {
      const now = Date.now()
      if (lastMoveTime) {
        const elapsed = Math.floor((now - lastMoveTime) / 1000)
        
        if (gameState.turn === 'w') {
          setWhiteTime(prev => Math.max(0, config.initial - elapsed))
        } else {
          setBlackTime(prev => Math.max(0, config.initial - elapsed))
        }
      }
    }, 100)
    
    return () => clearInterval(interval)
  }, [gameState.turn, gameState.isGameOver, isThinking, lastMoveTime, timeFormat, config.initial])
  
  // Format time display
  const formatTime = (seconds: number): string => {
    if (timeFormat === 'unlimited') return '∞'
    
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
  
  // Don't show timer for unlimited games
  if (timeFormat === 'unlimited') {
    return null
  }
  
  const isWhiteTurn = gameState.turn === 'w'
  const isWhiteLowTime = whiteTime <= 30
  const isBlackLowTime = blackTime <= 30
  
  return (
    <div className="timer-display">
      <div className="timer-row">
        <div className={`player-timer ${isWhiteTurn ? 'active' : ''} ${isWhiteLowTime ? 'low-time' : ''}`}>
          <div className="timer-label">
            ⚪ {playerSide === 'white' ? 'You' : 'AI'}
          </div>
          <div className="timer-value">{formatTime(whiteTime)}</div>
          {config.increment > 0 && (
            <div className="timer-increment">+{config.increment}s</div>
          )}
        </div>
        
        <div className={`player-timer ${!isWhiteTurn ? 'active' : ''} ${isBlackLowTime ? 'low-time' : ''}`}>
          <div className="timer-label">
            ⚫ {playerSide === 'black' ? 'You' : 'AI'}
          </div>
          <div className="timer-value">{formatTime(blackTime)}</div>
          {config.increment > 0 && (
            <div className="timer-increment">+{config.increment}s</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Timer 