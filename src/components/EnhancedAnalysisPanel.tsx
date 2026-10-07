import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { apiService, describeApiError } from '../services/apiService'
import { openingBook } from '../services/openingBook'
import { useGameStore } from '../store/gameStore'
import {
  calculateMoveAccuracy,
  classifyMove,
  type MoveAnalysis,
  type MoveClassification,
} from '../utils/analysis'
import AdvantageGraph from './AdvantageGraph'
import MoveAnalysisList from './MoveAnalysisList'

const classificationLabels: Record<MoveClassification, string> = {
  best: 'Best',
  excellent: 'Excellent',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
  book: 'Book',
}

const EnhancedAnalysisPanel: React.FC = () => {
  const { fullGamePgn, startFen, currentMoveIndex, goToMove } = useGameStore()
  const [moveAnalyses, setMoveAnalyses] = useState<MoveAnalysis[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisDepth, setAnalysisDepth] = useState(18)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const analysisRun = useRef(0)

  useEffect(() => {
    analysisRun.current += 1
    setMoveAnalyses([])
    setIsAnalyzing(false)
    setAnalysisProgress(0)
    setAnalysisError(null)
  }, [fullGamePgn, startFen])

  const stats = useMemo(() => {
    const result = {
      whiteAccuracy: 100,
      blackAccuracy: 100,
      counts: {
        best: 0,
        excellent: 0,
        good: 0,
        inaccuracy: 0,
        mistake: 0,
        blunder: 0,
        book: 0,
      } satisfies Record<MoveClassification, number>,
    }
    const whiteMoves = moveAnalyses.filter((analysis) => analysis.isWhiteMove)
    const blackMoves = moveAnalyses.filter((analysis) => !analysis.isWhiteMove)

    result.whiteAccuracy = whiteMoves.length
      ? whiteMoves.reduce((sum, move) => sum + move.accuracy, 0) / whiteMoves.length
      : 100
    result.blackAccuracy = blackMoves.length
      ? blackMoves.reduce((sum, move) => sum + move.accuracy, 0) / blackMoves.length
      : 100
    for (const analysis of moveAnalyses) result.counts[analysis.classification] += 1
    return result
  }, [moveAnalyses])

  const accuracyColor = (accuracy: number): string => {
    if (accuracy >= 95) return '#22c55e'
    if (accuracy >= 85) return '#16a34a'
    if (accuracy >= 75) return '#65a30d'
    if (accuracy >= 65) return '#eab308'
    if (accuracy >= 50) return '#f97316'
    return '#ef4444'
  }

  const analyzeGame = async () => {
    if (fullGamePgn.length === 0 || isAnalyzing) return

    const run = ++analysisRun.current
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setAnalysisError(null)

    try {
      const replay = new Chess(startFen)
      const initial = await apiService.evaluatePosition({ fen: replay.fen(), depth: analysisDepth })
      let previous = { score: initial.evaluation, mate: initial.mate }
      const analyses: MoveAnalysis[] = []

      for (let index = 0; index < fullGamePgn.length; index += 1) {
        if (analysisRun.current !== run) return

        const move = fullGamePgn[index]
        const isWhiteMove = replay.turn() === 'w'
        const moveNumber = Number(replay.fen().split(' ')[5]) || 1
        replay.move(move)
        const fen = replay.fen()
        const openingInfo = openingBook.lookupOpening(fen)
        let current = previous
        let bestMove: string | undefined
        let principalVariation: string[] | undefined

        try {
          const response = await apiService.evaluatePosition({ fen, depth: analysisDepth })
          current = { score: response.evaluation, mate: response.mate }
          bestMove = response.best_move
          principalVariation = response.analysis?.pv
        } catch (error) {
          setAnalysisError(describeApiError(error))
          console.error(`Failed to evaluate move ${index + 1}:`, error)
        }

        if (analysisRun.current !== run) return
        const accuracy = calculateMoveAccuracy(previous, current, isWhiteMove)
        analyses.push({
          moveNumber,
          move,
          fen,
          evaluation: current.score,
          mate: current.mate,
          bestMove,
          principalVariation,
          classification: openingInfo ? 'book' : classifyMove(accuracy.winChanceLoss),
          evaluationLoss: Math.abs(current.score - previous.score),
          winChanceLoss: openingInfo ? 0 : accuracy.winChanceLoss,
          accuracy: openingInfo ? 100 : accuracy.accuracy,
          openingInfo: openingInfo ?? undefined,
          isWhiteMove,
        })
        previous = current
        setAnalysisProgress(((index + 1) / fullGamePgn.length) * 100)
      }

      if (analysisRun.current === run) setMoveAnalyses(analyses)
    } catch (error) {
      if (analysisRun.current === run) setAnalysisError(describeApiError(error))
      console.error('Failed to analyze game:', error)
    } finally {
      if (analysisRun.current === run) setIsAnalyzing(false)
    }
  }

  return (
    <div className="enhanced-analysis-panel">
      <div className="analysis-header">
        <h3>📊 Game Analysis</h3>
        <div className="analysis-controls">
          <div className="depth-control">
            <label htmlFor="analysis-depth">Depth:</label>
            <select
              id="analysis-depth"
              value={analysisDepth}
              onChange={(event) => setAnalysisDepth(Number(event.target.value))}
              disabled={isAnalyzing}
              className="depth-selector"
            >
              {[12, 15, 18, 20].map((depth) => (
                <option key={depth} value={depth}>Depth {depth}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => void analyzeGame()}
            disabled={isAnalyzing || fullGamePgn.length === 0}
            className="analyze-game-btn"
          >
            {isAnalyzing ? `Analyzing… ${analysisProgress.toFixed(0)}%` : '🔍 Analyze Game'}
          </button>
        </div>
      </div>

      {isAnalyzing && (
        <div className="analysis-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${analysisProgress}%` }} />
          </div>
          <span className="progress-text">
            Analyzing move {Math.ceil(analysisProgress * fullGamePgn.length / 100)} of {fullGamePgn.length}
            {' '}(Depth {analysisDepth})
          </span>
        </div>
      )}
      {analysisError && <p className="analysis-error" role="alert">{analysisError}</p>}

      {moveAnalyses.length > 0 && (
        <>
          <AdvantageGraph analyses={moveAnalyses} onSelectMove={goToMove} />
          <div className="accuracy-summary">
            <h4>🎯 Player Accuracy</h4>
            <div className="accuracy-grid">
              {([
                ['white', '⚪', 'White', stats.whiteAccuracy],
                ['black', '⚫', 'Black', stats.blackAccuracy],
              ] as const).map(([side, icon, label, accuracy]) => (
                <div key={side} className={`accuracy-item ${side}`}>
                  <div className="accuracy-header">
                    <span className="player-icon">{icon}</span>
                    <span className="player-label">{label}</span>
                  </div>
                  <div className="accuracy-value" style={{ color: accuracyColor(accuracy) }}>
                    {accuracy.toFixed(1)}%
                  </div>
                  <div className="accuracy-bar">
                    <div
                      className="accuracy-fill"
                      style={{ width: `${accuracy}%`, backgroundColor: accuracyColor(accuracy) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="analysis-stats">
            <h4>📈 Move Quality Distribution</h4>
            <div className="stats-chess-com">
              {Object.entries(stats.counts).map(([classification, count]) => (
                <div key={classification} className="stat-row">
                  <span>{classificationLabels[classification as MoveClassification]}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>
          <MoveAnalysisList
            analyses={moveAnalyses}
            currentMoveIndex={currentMoveIndex}
            onSelectMove={goToMove}
          />
        </>
      )}

      {!isAnalyzing && moveAnalyses.length === 0 && fullGamePgn.length > 0 && (
        <div className="no-analysis">
          <p>Click “Analyze Game” to get detailed move analysis.</p>
        </div>
      )}
      {fullGamePgn.length === 0 && (
        <div className="no-game">
          <p>Play some moves to enable game analysis.</p>
        </div>
      )}
    </div>
  )
}

export default EnhancedAnalysisPanel
