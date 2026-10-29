import React from 'react'
import { useGameStore } from '../store/gameStore'
import EngineSelector from './EngineSelector'
import TemperatureControl from './TemperatureControl'

const GameSetup: React.FC = () => {
  const {
    selectedEngine,
    playerSide,
    gameMode,
    timeFormat,
    engines,
    enginesError,
    enginesLoading,
    setEngine,
    setGameMode,
    setPlayerSide,
    setTimeFormat,
    startGame,
  } = useGameStore()

  const isNanoGPT = selectedEngine.type === 'nanogpt'
  const isCompetitive = gameMode === 'competitive'
  const hasAvailableEngine = engines.some((engine) => engine.status === 'available')

  return (
    <div className={`game-setup ${isCompetitive ? 'competitive-setup' : ''}`}>
      {(enginesLoading || enginesError) && (
        <div className="api-connectivity-banner" role="status">
          {enginesLoading
            ? 'Connecting to the ChessGPT API…'
            : 'API offline: start chesstral-api on :8000'}
        </div>
      )}
      <div className="setup-header">
        <button className="setup-back-button" onClick={() => setGameMode('landing')}>
          ← Back
        </button>
        <h1>{isCompetitive ? '🏆 Challenge' : '🎯 Research Playground'}</h1>
        <p>
          {isCompetitive
            ? 'Play a timed game with no engine evaluation, analysis, or takebacks.'
            : 'Explore positions and analyze games with an AI chess engine.'}
        </p>
      </div>

      <div className="setup-content">
        <div className="setup-section">
          <h3>🤖 Choose Your Opponent</h3>
          <EngineSelector
            selectedEngine={selectedEngine}
            onEngineChange={setEngine}
            disabled={false}
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

          {isNanoGPT && playerSide === 'white' && (
            <div className="nanogpt-warning">
              ⚠️ <strong>Performance Notice:</strong> NanoGPT was trained to play as White and
              performs best in that role. When you play as White, it must play as Black.
            </div>
          )}
        </div>

        {isCompetitive && (
          <div className="setup-section">
            <h3>⏱️ Time Format</h3>
            <div className="time-format-selector">
              <button
                className={`time-btn ${timeFormat === 'blitz' ? 'active' : ''}`}
                onClick={() => setTimeFormat('blitz')}
              >
                <span className="time-icon">⚡</span>
                <span>Blitz</span>
                <span className="time-desc">3+2 minutes</span>
              </button>
              <button
                className={`time-btn ${timeFormat === 'rapid' ? 'active' : ''}`}
                onClick={() => setTimeFormat('rapid')}
              >
                <span className="time-icon">🏃</span>
                <span>Rapid</span>
                <span className="time-desc">10+5 minutes</span>
              </button>
              <button
                className={`time-btn ${timeFormat === 'classical' ? 'active' : ''}`}
                onClick={() => setTimeFormat('classical')}
              >
                <span className="time-icon">🏛️</span>
                <span>Classical</span>
                <span className="time-desc">30+30 minutes</span>
              </button>
              <button
                className={`time-btn ${timeFormat === 'unlimited' ? 'active' : ''}`}
                onClick={() => setTimeFormat('unlimited')}
              >
                <span className="time-icon">♾️</span>
                <span>Unlimited</span>
                <span className="time-desc">No time limit</span>
              </button>
            </div>
          </div>
        )}

        {!isCompetitive && (
          <div className="setup-section">
            <h3>🌡️ AI Temperature</h3>
            <TemperatureControl />
          </div>
        )}

        <div className="setup-actions">
          <button
            className="start-game-btn"
            onClick={startGame}
            disabled={enginesLoading || !hasAvailableEngine}
          >
            {isCompetitive ? 'Start Timed Game' : '🚀 Start Game'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameSetup
