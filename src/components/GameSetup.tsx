/**
 * GameSetup.tsx - Game Setup Screen
 * 
 * PURPOSE: Clean interface for configuring game settings before starting
 * FEATURES: Engine selection, color choice, temperature, start game button
 */

import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import EngineSelector from './EngineSelector'
import TemperatureControl from './TemperatureControl'

const GameSetup: React.FC = () => {
  const {
    selectedEngine,
    playerSide,
    gameMode,
    setEngine,
    setPlayerSide,
    setTimeFormat,
    startGame,
  } = useGameStore()

  // Competitive mode specific state
  const [playerElo, setPlayerElo] = useState<string>('')
  const [eloType, setEloType] = useState<'fide' | 'chess.com' | 'lichess'>('lichess')
  const [timeFormatLocal, setTimeFormatLocal] = useState<'blitz' | 'rapid' | 'classical' | 'unlimited'>('unlimited')

  const isNanoGPT = selectedEngine.type === 'nanogpt'
  const isCompetitive = gameMode === 'competitive'

  const handleStartGame = () => {
    // Save the time format to the store
    setTimeFormat(timeFormatLocal)
    startGame()
  }

  return (
    <div className={`game-setup ${isCompetitive ? 'competitive-setup' : ''}`}>
      <div className="setup-header">
        <h1>
          {isCompetitive ? '🏆 Competitive Match' : '🎯 ChessGPT Playground'}
        </h1>
        <p>
          {isCompetitive 
            ? 'Configure your rated game settings - this match will be recorded'
            : 'Configure your game settings and start playing against AI engines'
          }
        </p>
      </div>

      <div className="setup-content">
        <div className="setup-section">
          <h3>🤖 Choose Your Opponent</h3>
          <EngineSelector 
            selectedEngine={selectedEngine}
            onEngineChange={setEngine}
            disabled={false} // Allow selection during setup in both modes
          />
        </div>

        <div className="setup-section">
          <h3>⚫⚪ Choose Your Color</h3>
          <div className="color-selector">
            <button 
              className={`color-btn ${playerSide === 'white' ? 'active' : ''}`}
              onClick={() => setPlayerSide('white')}
            >
              <span className="color-icon">⚪</span>
              <span>Play as White</span>
              <span className="color-desc">You move first</span>
            </button>
            <button 
              className={`color-btn ${playerSide === 'black' ? 'active' : ''}`}
              onClick={() => setPlayerSide('black')}
            >
              <span className="color-icon">⚫</span>
              <span>Play as Black</span>
              <span className="color-desc">AI moves first</span>
            </button>
          </div>

          {/* NanoGPT Performance Warning */}
          {isNanoGPT && playerSide === 'white' && (
            <div className="nanogpt-warning">
              ⚠️ <strong>Performance Notice:</strong> NanoGPT was trained to play as White and performs best in that role. 
              When you play as White (forcing NanoGPT to play as Black), its performance will be significantly reduced.
            </div>
          )}
        </div>

        {/* Competitive Mode Specific Settings */}
        {isCompetitive && (
          <>
            <div className="setup-section">
              <h3>📊 Your Rating</h3>
              <div className="rating-input">
                <div className="rating-type-selector">
                  <button 
                    className={`rating-type-btn ${eloType === 'fide' ? 'active' : ''}`}
                    onClick={() => setEloType('fide')}
                  >
                    FIDE
                  </button>
                  <button 
                    className={`rating-type-btn ${eloType === 'chess.com' ? 'active' : ''}`}
                    onClick={() => setEloType('chess.com')}
                  >
                    Chess.com
                  </button>
                  <button 
                    className={`rating-type-btn ${eloType === 'lichess' ? 'active' : ''}`}
                    onClick={() => setEloType('lichess')}
                  >
                    Lichess
                  </button>
                </div>
                <input
                  type="number"
                  placeholder="Enter your rating (optional)"
                  value={playerElo}
                  onChange={(e) => setPlayerElo(e.target.value)}
                  className="elo-input"
                  min="400"
                  max="3000"
                />
              </div>
            </div>

            <div className="setup-section">
              <h3>⏱️ Time Format</h3>
              <div className="time-format-selector">
                <button 
                  className={`time-btn ${timeFormatLocal === 'blitz' ? 'active' : ''}`}
                  onClick={() => setTimeFormatLocal('blitz')}
                >
                  <span className="time-icon">⚡</span>
                  <span>Blitz</span>
                  <span className="time-desc">3+2 minutes</span>
                </button>
                <button 
                  className={`time-btn ${timeFormatLocal === 'rapid' ? 'active' : ''}`}
                  onClick={() => setTimeFormatLocal('rapid')}
                >
                  <span className="time-icon">🏃</span>
                  <span>Rapid</span>
                  <span className="time-desc">10+5 minutes</span>
                </button>
                <button 
                  className={`time-btn ${timeFormatLocal === 'classical' ? 'active' : ''}`}
                  onClick={() => setTimeFormatLocal('classical')}
                >
                  <span className="time-icon">🏛️</span>
                  <span>Classical</span>
                  <span className="time-desc">30+30 minutes</span>
                </button>
                <button 
                  className={`time-btn ${timeFormatLocal === 'unlimited' ? 'active' : ''}`}
                  onClick={() => setTimeFormatLocal('unlimited')}
                >
                  <span className="time-icon">♾️</span>
                  <span>Unlimited</span>
                  <span className="time-desc">No time limit</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Research Mode Temperature Control */}
        {!isCompetitive && (
          <div className="setup-section">
            <h3>🌡️ AI Temperature</h3>
            <TemperatureControl />
          </div>
        )}

        <div className="setup-actions">
          <button 
            className="start-game-btn"
            onClick={handleStartGame}
          >
            {isCompetitive ? '🏆 Start Rated Game' : '🚀 Start Game'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameSetup 