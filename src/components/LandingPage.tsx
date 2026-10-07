import React from 'react'
import { useGameStore } from '../store/gameStore'

const LandingPage: React.FC = () => {
  const { setGameMode } = useGameStore()

  return (
    <div className="landing-page">
      <div className="landing-header">
        <h1>🎯 ChessGPT</h1>
        <p>Play against AI engines or explore chess positions.</p>
      </div>

      <div className="landing-options">
        <div className="option-card competitive" onClick={() => setGameMode('competitive')}>
          <div className="card-icon">🏆</div>
          <h2>Challenge</h2>
          <p>Choose a clock and play an AI engine. Challenge mode has no evaluation, analysis, or takebacks, and includes resign.</p>
          <div className="card-features">
            <span>• Configurable time controls</span>
            <span>• Resign option</span>
            <span>• Multiple AI engines</span>
            <span>• No takebacks</span>
          </div>
          <button className="card-button">Start Challenge</button>
        </div>

        <div className="option-card research" onClick={() => setGameMode('research')}>
          <div className="card-icon">🔬</div>
          <h2>Research Playground</h2>
          <p>Explore positions, review moves, and analyze games with an available AI engine.</p>
          <div className="card-features">
            <span>• Engine selection</span>
            <span>• Position evaluation</span>
            <span>• Move analysis</span>
            <span>• FEN and PGN loading</span>
          </div>
          <button className="card-button">Enter Playground</button>
        </div>
      </div>

      <div className="landing-footer">
        <p>Built with ❤️ for chess and AI research</p>
      </div>
    </div>
  )
}

export default LandingPage
