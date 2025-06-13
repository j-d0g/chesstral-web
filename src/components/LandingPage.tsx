/**
 * LandingPage.tsx - Main Landing Page
 * 
 * PURPOSE: Entry point for users to choose their experience
 * FEATURES: Three main paths - competitive, research, leaderboard
 */

import React from 'react'
import { useGameStore } from '../store/gameStore'

const LandingPage: React.FC = () => {
  const { setGameMode } = useGameStore()

  return (
    <div className="landing-page">
      <div className="landing-header">
        <h1>🎯 ChessGPT Platform</h1>
        <p>Challenge AI engines, explore chess research, and discover the future of AI chess</p>
      </div>

      <div className="landing-options">
        <div className="option-card competitive" onClick={() => setGameMode('competitive')}>
          <div className="card-icon">🏆</div>
          <h2>Challenge Our Bots</h2>
          <p>Official games with ELO tracking, time controls, and competitive rankings</p>
          <div className="card-features">
            <span>• ELO Rating System</span>
            <span>• Official Game Records</span>
            <span>• Multiple AI Engines</span>
            <span>• Time Controls</span>
          </div>
          <button className="card-button">Start Challenge</button>
        </div>

        <div className="option-card research" onClick={() => setGameMode('research')}>
          <div className="card-icon">🔬</div>
          <h2>Research Playground</h2>
          <p>Experiment freely with AI engines, analyze positions, and explore chess insights</p>
          <div className="card-features">
            <span>• Live Engine Switching</span>
            <span>• Move Navigation</span>
            <span>• Position Analysis</span>
            <span>• PGN Editing</span>
          </div>
          <button className="card-button">Enter Playground</button>
        </div>

        <div className="option-card leaderboard disabled">
          <div className="card-icon">📊</div>
          <h2>LLM Leaderboard</h2>
          <p>Compare AI engine performance, view statistics, and track improvements</p>
          <div className="card-features">
            <span>• Engine Rankings</span>
            <span>• Performance Metrics</span>
            <span>• Historical Data</span>
            <span>• Model Comparisons</span>
          </div>
          <button className="card-button disabled">Coming Soon</button>
        </div>
      </div>

      <div className="landing-footer">
        <p>Built with ❤️ for chess and AI research</p>
      </div>
    </div>
  )
}

export default LandingPage 