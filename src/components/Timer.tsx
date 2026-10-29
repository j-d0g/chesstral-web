import React, { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { sideToMoveAfter } from '../utils/clock'

interface TimerProps {
  timeFormat: 'blitz' | 'rapid' | 'classical' | 'unlimited'
}

function formatTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1_000)
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
}

const Timer: React.FC<TimerProps> = ({ timeFormat }) => {
  const { clock, gameMode, gameStatus, startFen, fullGamePgn, playerSide, tickClock } = useGameStore()

  useEffect(() => {
    if (gameMode !== 'competitive' || gameStatus !== 'active' || timeFormat === 'unlimited') return
    const interval = window.setInterval(tickClock, 200)
    return () => window.clearInterval(interval)
  }, [gameMode, gameStatus, timeFormat, tickClock])

  if (timeFormat === 'unlimited') return null

  const startingTurn = startFen.split(' ')[1] === 'b' ? 'b' : 'w'
  const whiteTurn = sideToMoveAfter(startingTurn, fullGamePgn.length) === 'w'
  const whiteLow = clock.white <= 30_000
  const blackLow = clock.black <= 30_000

  return (
    <div className="timer-display">
      <div className="timer-row">
        <div className={`player-timer ${whiteTurn ? 'active' : ''} ${whiteLow ? 'low-time' : ''}`}>
          <div className="timer-label">⚪ {playerSide === 'white' ? 'You' : 'AI'}</div>
          <div className="timer-value">{formatTime(clock.white)}</div>
        </div>
        <div className={`player-timer ${!whiteTurn ? 'active' : ''} ${blackLow ? 'low-time' : ''}`}>
          <div className="timer-label">⚫ {playerSide === 'black' ? 'You' : 'AI'}</div>
          <div className="timer-value">{formatTime(clock.black)}</div>
        </div>
      </div>
    </div>
  )
}

export default Timer
