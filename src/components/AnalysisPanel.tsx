/**
 * AnalysisPanel.tsx - Comprehensive Chess Position Analysis
 * 
 * PURPOSE: Display detailed Stockfish analysis for research mode
 * FEATURES: Evaluation, best moves, principal variation, position assessment
 */

import React, { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { apiService } from '../services/apiService'
import EvaluationBar from './EvaluationBar'

interface AnalysisData {
  evaluation: number
  best_move?: string
  analysis?: {
    depth?: number
    pv?: string[]
    nodes?: number
    time?: number
    multipv?: Array<{
      move: string
      evaluation: number
      pv: string[]
    }>
  }
}

const AnalysisPanel: React.FC = () => {
  const { gameState, evaluation } = useGameStore()
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisDepth, setAnalysisDepth] = useState(15)
  const [error, setError] = useState<string | null>(null)

  // Auto-analyze when position changes
  useEffect(() => {
    if (gameState.fen) {
      analyzePosition()
    }
  }, [gameState.fen, analysisDepth])

  const analyzePosition = async () => {
    setIsAnalyzing(true)
    setError(null)
    
    try {
      const response = await apiService.evaluatePosition({
        fen: gameState.fen,
        depth: analysisDepth
      })
      
      setAnalysisData(response)
    } catch (err) {
      console.error('Analysis error:', err)
      setError('Failed to analyze position')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const formatEvaluation = (evaluation: number): string => {
    if (Math.abs(evaluation) > 100) {
      // Mate in X moves
      const mateIn = Math.ceil((1000 - Math.abs(evaluation)) / 2)
      return evaluation > 0 ? `M${mateIn}` : `-M${mateIn}`
    }
    return evaluation > 0 ? `+${evaluation.toFixed(2)}` : evaluation.toFixed(2)
  }

  const getPositionAssessment = (evaluation: number): { text: string, color: string } => {
    const absEval = Math.abs(evaluation)
    
    if (absEval > 100) {
      return { text: evaluation > 0 ? 'White is winning' : 'Black is winning', color: evaluation > 0 ? '#4CAF50' : '#F44336' }
    } else if (absEval > 3) {
      return { text: evaluation > 0 ? 'White is much better' : 'Black is much better', color: evaluation > 0 ? '#4CAF50' : '#F44336' }
    } else if (absEval > 1.5) {
      return { text: evaluation > 0 ? 'White is better' : 'Black is better', color: evaluation > 0 ? '#8BC34A' : '#FF5722' }
    } else if (absEval > 0.5) {
      return { text: evaluation > 0 ? 'White is slightly better' : 'Black is slightly better', color: evaluation > 0 ? '#CDDC39' : '#FF9800' }
    } else {
      return { text: 'Equal position', color: '#FFC107' }
    }
  }

  return (
    <div className="analysis-panel">
      <div className="analysis-header">
        <h3>🔍 Position Analysis</h3>
        <div className="analysis-controls">
          <label>
            Depth:
            <select 
              value={analysisDepth} 
              onChange={(e) => setAnalysisDepth(Number(e.target.value))}
              disabled={isAnalyzing}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={25}>25</option>
            </select>
          </label>
          <button 
            onClick={analyzePosition}
            disabled={isAnalyzing}
            className="analyze-btn"
          >
            {isAnalyzing ? '🔄 Analyzing...' : '🔍 Analyze'}
          </button>
        </div>
      </div>

      {/* Evaluation Bar */}
      <EvaluationBar evaluation={analysisData?.evaluation || evaluation} />

      {error && (
        <div className="analysis-error">
          ⚠️ {error}
        </div>
      )}

      {isAnalyzing && (
        <div className="analysis-loading">
          <div className="loading-spinner"></div>
          <span>Analyzing position at depth {analysisDepth}...</span>
        </div>
      )}

      {analysisData && !isAnalyzing && (
        <div className="analysis-results">
          {/* Main Evaluation */}
          <div className="eval-summary">
            <div className="eval-score">
              <span className="eval-label">Evaluation:</span>
              <span className="eval-value">{formatEvaluation(analysisData.evaluation)}</span>
            </div>
            <div 
              className="position-assessment"
              style={{ color: getPositionAssessment(analysisData.evaluation).color }}
            >
              {getPositionAssessment(analysisData.evaluation).text}
            </div>
          </div>

          {/* Best Move */}
          {analysisData.best_move && (
            <div className="best-move-section">
              <h4>💡 Best Move</h4>
              <div className="best-move">
                <span className="move-notation">{analysisData.best_move}</span>
                <span className="move-eval">{formatEvaluation(analysisData.evaluation)}</span>
              </div>
            </div>
          )}

          {/* Analysis Details */}
          {analysisData.analysis && (
            <div className="analysis-details">
              <h4>📊 Analysis Details</h4>
              
              {analysisData.analysis.depth && (
                <div className="detail-row">
                  <span className="detail-label">Depth:</span>
                  <span className="detail-value">{analysisData.analysis.depth}</span>
                </div>
              )}
              
              {analysisData.analysis.nodes && (
                <div className="detail-row">
                  <span className="detail-label">Nodes:</span>
                  <span className="detail-value">{analysisData.analysis.nodes.toLocaleString()}</span>
                </div>
              )}
              
              {analysisData.analysis.time && (
                <div className="detail-row">
                  <span className="detail-label">Time:</span>
                  <span className="detail-value">{(analysisData.analysis.time / 1000).toFixed(2)}s</span>
                </div>
              )}

              {/* Principal Variation */}
              {analysisData.analysis.pv && analysisData.analysis.pv.length > 0 && (
                <div className="pv-section">
                  <h5>🎯 Principal Variation</h5>
                  <div className="pv-moves">
                    {analysisData.analysis.pv.slice(0, 10).map((move, index) => (
                      <span key={index} className="pv-move">
                        {index % 2 === 0 && `${Math.floor(index / 2) + 1}.`} {move}
                      </span>
                    ))}
                    {analysisData.analysis.pv.length > 10 && <span className="pv-more">...</span>}
                  </div>
                </div>
              )}

              {/* Multiple PV Lines */}
              {analysisData.analysis.multipv && analysisData.analysis.multipv.length > 1 && (
                <div className="multipv-section">
                  <h5>🔀 Alternative Lines</h5>
                  {analysisData.analysis.multipv.slice(1, 4).map((line, index) => (
                    <div key={index} className="multipv-line">
                      <span className="multipv-move">{line.move}</span>
                      <span className="multipv-eval">{formatEvaluation(line.evaluation)}</span>
                      <div className="multipv-pv">
                        {line.pv.slice(0, 5).join(' ')}
                        {line.pv.length > 5 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!analysisData && !isAnalyzing && !error && (
        <div className="no-analysis">
          <p>Click "Analyze" to get detailed position evaluation</p>
        </div>
      )}
    </div>
  )
}

export default AnalysisPanel 