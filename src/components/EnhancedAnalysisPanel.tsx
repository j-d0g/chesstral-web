/**
 * EnhancedAnalysisPanel.tsx - Advanced Chess Analysis with Move Classification
 * 
 * PURPOSE: Provide detailed game analysis with move quality assessment and advantage tracking
 * FEATURES: Move classification, advantage graph, expandable lines, statistics, accuracy tracking
 */

import React, { useEffect, useState, useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { apiService } from '../services/apiService'
import { openingBook, OpeningInfo } from '../services/openingBook'

interface MoveAnalysis {
  moveNumber: number
  move: string
  fen: string
  evaluation: number
  bestMove?: string
  classification: 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book'
  evaluationLoss: number
  winChanceLoss: number
  accuracy: number
  principalVariation?: string[]
  openingInfo?: OpeningInfo
  isWhiteMove: boolean
}

interface AnalysisStats {
  best: number
  excellent: number
  good: number
  inaccuracy: number
  mistake: number
  blunder: number
  book: number
  whiteAccuracy: number
  blackAccuracy: number
  totalMoves: number
}

interface PlayerStats {
  accuracy: number
  best: number
  excellent: number
  good: number
  inaccuracy: number
  mistake: number
  blunder: number
  book: number
  totalMoves: number
}

const EnhancedAnalysisPanel: React.FC = () => {
  const { gameState, fullGamePgn, currentMoveIndex, goToMove } = useGameStore()
  const [moveAnalyses, setMoveAnalyses] = useState<MoveAnalysis[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [expandedMove, setExpandedMove] = useState<number | null>(null)
  const [analysisDepth, setAnalysisDepth] = useState(18)

  // Calculate comprehensive statistics
  const stats: AnalysisStats = useMemo(() => {
    const whiteStats: PlayerStats = {
      accuracy: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0, totalMoves: 0
    }
    const blackStats: PlayerStats = {
      accuracy: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0, totalMoves: 0
    }

    let whiteAccuracySum = 0
    let blackAccuracySum = 0

    moveAnalyses.forEach((analysis) => {
      const playerStats = analysis.isWhiteMove ? whiteStats : blackStats
      playerStats[analysis.classification]++
      playerStats.totalMoves++
      
      if (analysis.isWhiteMove) {
        whiteAccuracySum += analysis.accuracy
      } else {
        blackAccuracySum += analysis.accuracy
      }
    })

    whiteStats.accuracy = whiteStats.totalMoves > 0 ? whiteAccuracySum / whiteStats.totalMoves : 100
    blackStats.accuracy = blackStats.totalMoves > 0 ? blackAccuracySum / blackStats.totalMoves : 100

    return {
      best: whiteStats.best + blackStats.best,
      excellent: whiteStats.excellent + blackStats.excellent,
      good: whiteStats.good + blackStats.good,
      inaccuracy: whiteStats.inaccuracy + blackStats.inaccuracy,
      mistake: whiteStats.mistake + blackStats.mistake,
      blunder: whiteStats.blunder + blackStats.blunder,
      book: whiteStats.book + blackStats.book,
      whiteAccuracy: whiteStats.accuracy,
      blackAccuracy: blackStats.accuracy,
      totalMoves: moveAnalyses.length
    }
  }, [moveAnalyses])

  // Analyze all moves in the game
  const analyzeGame = async () => {
    if (fullGamePgn.length === 0) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    const analyses: MoveAnalysis[] = []

    try {
      // Create a temporary game to replay moves
      const { Chess } = await import('chess.js')
      const tempGame = new Chess()
      let previousEval = 0

      for (let i = 0; i < fullGamePgn.length; i++) {
        const move = fullGamePgn[i]
        const moveNumber = Math.ceil((i + 1) / 2)
        const isWhiteMove = i % 2 === 0
        
        // Get position before the move
        const fenBeforeMove = tempGame.fen()
        
        // Make the move
        tempGame.move(move)
        const fenAfterMove = tempGame.fen()
        
        // Check if position is in opening book
        const openingInfo = openingBook.lookupOpening(fenAfterMove)
        
        if (openingInfo) {
          // This is a book move
          analyses.push({
            moveNumber,
            move,
            fen: fenAfterMove,
            evaluation: 0, // Neutral evaluation for book moves
            classification: 'book',
            evaluationLoss: 0,
            winChanceLoss: 0,
            accuracy: 100, // Book moves are considered perfect
            openingInfo,
            isWhiteMove
          })
          previousEval = 0 // Keep evaluation neutral in opening
        } else {
          try {
            // Evaluate position after move (out of book)
            const evalResponse = await apiService.evaluatePosition({
              fen: fenAfterMove,
              depth: analysisDepth
            })
            
            const currentEval = evalResponse.evaluation
            const evaluationLoss = Math.abs(currentEval - previousEval)
            
            // Calculate winning chance loss and accuracy
            const { winChanceLoss, accuracy } = calculateMoveAccuracy(previousEval, currentEval, isWhiteMove)
            
            // Classify the move based on winning chance loss
            const classification = classifyMove(winChanceLoss)
            
            analyses.push({
              moveNumber,
              move,
              fen: fenAfterMove,
              evaluation: currentEval,
              bestMove: evalResponse.best_move,
              classification,
              evaluationLoss,
              winChanceLoss,
              accuracy,
              principalVariation: evalResponse.analysis?.pv,
              isWhiteMove
            })
            
            previousEval = currentEval
          } catch (error) {
            console.error(`Error analyzing move ${i + 1}:`, error)
            // Add a basic analysis entry even if evaluation fails
            analyses.push({
              moveNumber,
              move,
              fen: fenAfterMove,
              evaluation: 0,
              classification: 'good',
              evaluationLoss: 0,
              winChanceLoss: 0,
              accuracy: 85,
              isWhiteMove
            })
          }
        }
        
        setAnalysisProgress(((i + 1) / fullGamePgn.length) * 100)
      }
      
      setMoveAnalyses(analyses)
    } catch (error) {
      console.error('Error during game analysis:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Convert centipawn evaluation to approximate winning percentage
  const evalToWinningChance = (evaluation: number): number => {
    // Use Lichess formula: p(white win) = 50 + 50 * (2/(1 + e^(-0.00368208 * centipawns)) - 1)
    // Convert to 0-1 range: (50 + 50 * (2/(1 + e^(-0.00368208 * centipawns)) - 1)) / 100
    const centipawns = evaluation * 100 // Convert from pawns to centipawns
    const lichessWinChance = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * centipawns)) - 1)
    return lichessWinChance / 100 // Convert to 0-1 range
  }

  // Calculate move accuracy and winning chance loss
  const calculateMoveAccuracy = (previousEval: number, currentEval: number, isWhiteMove: boolean): { winChanceLoss: number, accuracy: number } => {
    const previousWinChance = evalToWinningChance(previousEval)
    const currentWinChance = evalToWinningChance(currentEval)
    
    // For white moves, losing winning chance is bad. For black moves, gaining winning chance (for white) is bad.
    const winChanceLoss = isWhiteMove 
      ? Math.max(0, previousWinChance - currentWinChance)
      : Math.max(0, currentWinChance - previousWinChance)
    
    // Convert winning chance loss to accuracy percentage (chess.com style)
    const accuracy = Math.max(0, 100 - (winChanceLoss * 400)) // Scale factor similar to chess.com
    
    return { winChanceLoss, accuracy }
  }

  // Classify move quality based on winning chance loss (chess.com style thresholds)
  const classifyMove = (winChanceLoss: number): MoveAnalysis['classification'] => {
    if (winChanceLoss <= 0.02) return 'best' // 0-2% winning chance loss
    if (winChanceLoss <= 0.05) return 'excellent' // 2-5% winning chance loss
    if (winChanceLoss <= 0.10) return 'good' // 5-10% winning chance loss  
    if (winChanceLoss <= 0.20) return 'inaccuracy' // 10-20% winning chance loss
    if (winChanceLoss <= 0.30) return 'mistake' // 20-30% winning chance loss
    return 'blunder' // 30%+ winning chance loss
  }

  // Get color and symbol for move classification
  const getClassificationStyle = (classification: MoveAnalysis['classification']) => {
    const styles = {
      best: { color: '#22c55e', symbol: '!!', bgColor: 'rgba(34, 197, 94, 0.1)' },
      excellent: { color: '#16a34a', symbol: '!', bgColor: 'rgba(22, 163, 74, 0.1)' },
      good: { color: '#65a30d', symbol: '', bgColor: 'rgba(101, 163, 13, 0.1)' },
      inaccuracy: { color: '#eab308', symbol: '?!', bgColor: 'rgba(234, 179, 8, 0.1)' },
      mistake: { color: '#f97316', symbol: '?', bgColor: 'rgba(249, 115, 22, 0.1)' },
      blunder: { color: '#ef4444', symbol: '??', bgColor: 'rgba(239, 68, 68, 0.1)' },
      book: { color: '#3b82f6', symbol: '📖', bgColor: 'rgba(59, 130, 246, 0.1)' }
    }
    return styles[classification]
  }

  // Get emoji and label for move classification
  const getClassificationInfo = (classification: MoveAnalysis['classification']) => {
    const info = {
      best: { emoji: '🎯', label: 'Best Move', description: 'Perfect or near-perfect move' },
      excellent: { emoji: '⭐', label: 'Excellent', description: 'Very strong move with minimal loss' },
      good: { emoji: '✅', label: 'Good', description: 'Solid move with acceptable loss' },
      inaccuracy: { emoji: '⚠️', label: 'Inaccuracy', description: 'Suboptimal but not critical' },
      mistake: { emoji: '❌', label: 'Mistake', description: 'Poor move that loses advantage' },
      blunder: { emoji: '💥', label: 'Blunder', description: 'Serious error with major consequences' },
      book: { emoji: '📚', label: 'Book', description: 'Theoretical opening move' }
    }
    return info[classification]
  }

  // Get accuracy color based on percentage
  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 95) return '#22c55e' // Excellent
    if (accuracy >= 85) return '#16a34a' // Very good
    if (accuracy >= 75) return '#65a30d' // Good
    if (accuracy >= 65) return '#eab308' // Fair
    if (accuracy >= 50) return '#f97316' // Poor
    return '#ef4444' // Very poor
  }

  // Format evaluation for display
  const formatEvaluation = (evaluation: number): string => {
    if (Math.abs(evaluation) > 100) {
      const mateIn = Math.ceil((1000 - Math.abs(evaluation)) / 2)
      return evaluation > 0 ? `M${mateIn}` : `-M${mateIn}`
    }
    return evaluation > 0 ? `+${evaluation.toFixed(2)}` : evaluation.toFixed(2)
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
              onChange={(e) => setAnalysisDepth(Number(e.target.value))}
              disabled={isAnalyzing}
              className="depth-selector"
              title="Higher depth = more accurate analysis but slower"
            >
              <option value={12}>12 - Fast (~30s)</option>
              <option value={15}>15 - Standard (~1min)</option>
              <option value={18}>18 - Deep (~2min)</option>
              <option value={20}>20 - Thorough (~4min)</option>
              <option value={22}>22 - Very Deep (~8min)</option>
              <option value={25}>25 - Maximum (~15min)</option>
            </select>
          </div>
          <button 
            onClick={analyzeGame}
            disabled={isAnalyzing || fullGamePgn.length === 0}
            className="analyze-game-btn"
          >
            {isAnalyzing ? `Analyzing... ${analysisProgress.toFixed(0)}%` : '🔍 Analyze Game'}
          </button>
        </div>
      </div>

      {isAnalyzing && (
        <div className="analysis-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
          <span className="progress-text">
            Analyzing move {Math.ceil(analysisProgress * fullGamePgn.length / 100)} of {fullGamePgn.length} 
            (Depth {analysisDepth})
          </span>
        </div>
      )}

              {moveAnalyses.length > 0 && (
          <>
            {/* Advantage Graph - Main Feature at Top */}
                        <div className="advantage-graph">
              <h4>📈 Advantage Graph</h4>
              <div className="graph-container">
                <svg width="100%" height="200" className="advantage-chart" viewBox="0 0 600 200">
                {/* Gradients for filled areas */}
                <defs>
                  <linearGradient id="whiteAdvantage" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0.2)" />
                  </linearGradient>
                  <linearGradient id="blackAdvantage" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(0, 0, 0, 0.2)" />
                    <stop offset="100%" stopColor="rgba(0, 0, 0, 0.9)" />
                  </linearGradient>
                </defs>
                
                {/* Background */}
                <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.3)" rx="8" />
                
                                  {/* Grid lines */}
                  <line x1="0" y1="50" x2="600" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="0" y1="100" x2="600" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                  <line x1="0" y1="150" x2="600" y2="150" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  
                  {moveAnalyses.length > 1 && (
                    <>
                      {/* Create path for advantage areas */}
                      {(() => {
                        const points = moveAnalyses.map((analysis, index) => {
                          const x = (index / (moveAnalyses.length - 1)) * 600
                          const clampedEval = Math.max(-3, Math.min(3, analysis.evaluation))
                          const y = 100 - (clampedEval * 33) // Center at 100, scale by 33px per pawn
                          return { x, y, eval: analysis.evaluation }
                        })
                        
                        // Create straight line path
                        const pathData = points.reduce((path, point, index) => {
                          if (index === 0) {
                            return `M ${point.x} ${point.y}`
                          } else {
                            return `${path} L ${point.x} ${point.y}`
                          }
                        }, '')
                        
                        // White advantage area (above center)
                        const whiteAreaPath = `${pathData} L 600 100 L 0 100 Z`
                        // Black advantage area (below center)  
                        const blackAreaPath = `${pathData} L 600 100 L 0 100 Z`
                        
                        return (
                          <>
                            {/* White advantage area */}
                            <clipPath id="whiteClip">
                              <rect x="0" y="0" width="600" height="100" />
                            </clipPath>
                            <path
                              d={whiteAreaPath}
                              fill="url(#whiteAdvantage)"
                              clipPath="url(#whiteClip)"
                            />
                            
                            {/* Black advantage area */}
                            <clipPath id="blackClip">
                              <rect x="0" y="100" width="600" height="100" />
                            </clipPath>
                            <path
                              d={blackAreaPath}
                              fill="url(#blackAdvantage)"
                              clipPath="url(#blackClip)"
                            />
                            
                            {/* Main evaluation line */}
                            <path
                              d={pathData}
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            
                            {/* Move quality dots */}
                            {points.map((point, index) => {
                              const analysis = moveAnalyses[index]
                              const style = getClassificationStyle(analysis.classification)
                              
                              return (
                                <circle
                                  key={index}
                                  cx={point.x}
                                  cy={point.y}
                                  r="5"
                                  fill={style.color}
                                  stroke="white"
                                  strokeWidth="2"
                                  className="graph-point"
                                  onClick={() => goToMove(index)}
                                  style={{ cursor: 'pointer' }}
                                />
                              )
                            })}
                          </>
                        )
                      })()}
                    </>
                  )}
                  
                  {/* Y-axis labels */}
                  <text x="15" y="30" fill="rgba(255,255,255,0.7)" fontSize="14" fontFamily="monospace">+3</text>
                  <text x="15" y="105" fill="rgba(255,255,255,0.7)" fontSize="14" fontFamily="monospace">0</text>
                  <text x="15" y="180" fill="rgba(255,255,255,0.7)" fontSize="14" fontFamily="monospace">-3</text>
              </svg>
            </div>
          </div>

          {/* Player Accuracy Summary */}
          <div className="accuracy-summary">
            <h4>🎯 Player Accuracy</h4>
            <div className="accuracy-grid">
              <div className="accuracy-item white">
                <div className="accuracy-header">
                  <span className="player-icon">⚪</span>
                  <span className="player-label">White</span>
                </div>
                <div className="accuracy-value" style={{ color: getAccuracyColor(stats.whiteAccuracy) }}>
                  {stats.whiteAccuracy.toFixed(1)}%
                </div>
                <div className="accuracy-bar">
                  <div 
                    className="accuracy-fill" 
                    style={{ 
                      width: `${stats.whiteAccuracy}%`,
                      backgroundColor: getAccuracyColor(stats.whiteAccuracy)
                    }}
                  />
                </div>
              </div>
              <div className="accuracy-item black">
                <div className="accuracy-header">
                  <span className="player-icon">⚫</span>
                  <span className="player-label">Black</span>
                </div>
                <div className="accuracy-value" style={{ color: getAccuracyColor(stats.blackAccuracy) }}>
                  {stats.blackAccuracy.toFixed(1)}%
                </div>
                <div className="accuracy-bar">
                  <div 
                    className="accuracy-fill" 
                    style={{ 
                      width: `${stats.blackAccuracy}%`,
                      backgroundColor: getAccuracyColor(stats.blackAccuracy)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Move Quality Distribution - Chess.com Style */}
          <div className="analysis-stats">
            <h4>📈 Move Quality Distribution</h4>
            <div className="stats-chess-com">
              {/* Calculate separate stats for white and black */}
              {(() => {
                const whiteStats = { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0 }
                const blackStats = { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0 }
                
                moveAnalyses.forEach((analysis) => {
                  const playerStats = analysis.isWhiteMove ? whiteStats : blackStats
                  playerStats[analysis.classification as keyof typeof playerStats]++
                })
                
                const moveTypes = [
                  { key: 'best', label: 'Best Move', color: '#22c55e', icon: '🎯' },
                  { key: 'excellent', label: 'Excellent', color: '#16a34a', icon: '⭐' },
                  { key: 'good', label: 'Good', color: '#65a30d', icon: '✅' },
                  { key: 'book', label: 'Book', color: '#3b82f6', icon: '📚' },
                  { key: 'inaccuracy', label: 'Inaccuracy', color: '#eab308', icon: '⚠️' },
                  { key: 'mistake', label: 'Mistake', color: '#f97316', icon: '❌' },
                  { key: 'blunder', label: 'Blunder', color: '#ef4444', icon: '💥' }
                ]
                
                return moveTypes.map((moveType) => (
                  <div key={moveType.key} className="stat-row">
                                         <div className="stat-left-count" style={{ color: moveType.color }}>
                       {whiteStats[moveType.key as keyof typeof whiteStats]}
                     </div>
                     <div className="stat-center">
                       <span className="stat-icon">{moveType.icon}</span>
                       <span className="stat-label" style={{ color: moveType.color }}>
                         {moveType.label}
                       </span>
                     </div>
                     <div className="stat-right-count" style={{ color: moveType.color }}>
                       {blackStats[moveType.key as keyof typeof blackStats]}
                     </div>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* Move List with Analysis */}
          <div className="analyzed-moves">
            <h4>🎯 Move Analysis</h4>
            <div className="moves-list-container">
              <div className="moves-list">
              {moveAnalyses.map((analysis, index) => {
                const style = getClassificationStyle(analysis.classification)
                const isCurrentMove = index === currentMoveIndex
                const isExpanded = expandedMove === index
                
                return (
                  <div 
                    key={index} 
                    className={`move-analysis-item ${isCurrentMove ? 'current' : ''} ${analysis.classification}`}
                    style={{ backgroundColor: style.bgColor }}
                  >
                    <div 
                      className="move-summary"
                      onClick={() => goToMove(index)}
                      title={getClassificationInfo(analysis.classification).description}
                    >
                      <span className="move-number">
                        {index % 2 === 0 ? `${Math.ceil((index + 1) / 2)}.` : `${Math.ceil((index + 1) / 2)}...`}
                      </span>
                      <span className="move-notation">{analysis.move}</span>
                      <span 
                        className="move-classification"
                        style={{ color: style.color }}
                        title={getClassificationInfo(analysis.classification).label}
                      >
                        {style.symbol}
                      </span>
                      <span className="move-accuracy" style={{ color: getAccuracyColor(analysis.accuracy) }}>
                        {analysis.accuracy.toFixed(0)}%
                      </span>
                      <span className="move-evaluation">
                        {analysis.classification === 'book' && analysis.openingInfo 
                          ? `${analysis.openingInfo.eco}` 
                          : formatEvaluation(analysis.evaluation)
                        }
                      </span>
                      {((analysis.bestMove && analysis.bestMove !== analysis.move) || analysis.openingInfo) && (
                        <button 
                          className="expand-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedMove(isExpanded ? null : index)
                          }}
                          title="Show details"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      )}
                    </div>
                    
                    {isExpanded && (
                      <div className="move-details">
                        {analysis.openingInfo ? (
                          <div className="opening-info">
                            <div className="opening-name">
                              <strong>{analysis.openingInfo.name}</strong>
                            </div>
                            <div className="opening-eco">
                              ECO: {analysis.openingInfo.eco}
                            </div>
                            {analysis.openingInfo.pgn && (
                              <div className="opening-line">
                                <span className="pv-label">Line:</span>
                                <span className="pv-moves">{analysis.openingInfo.pgn}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="move-quality-details">
                              <div className="quality-row">
                                <span className="quality-label">Classification:</span>
                                <span className="quality-value" style={{ color: style.color }}>
                                  {getClassificationInfo(analysis.classification).emoji} {getClassificationInfo(analysis.classification).label}
                                </span>
                              </div>
                              <div className="quality-row">
                                <span className="quality-label">Accuracy:</span>
                                <span className="quality-value" style={{ color: getAccuracyColor(analysis.accuracy) }}>
                                  {analysis.accuracy.toFixed(1)}%
                                </span>
                              </div>
                              {analysis.winChanceLoss > 0 && (
                                <div className="quality-row">
                                  <span className="quality-label">Win Chance Loss:</span>
                                  <span className="quality-value" style={{ color: style.color }}>
                                    -{(analysis.winChanceLoss * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            {analysis.bestMove && analysis.bestMove !== analysis.move && (
                              <div className="best-move-info">
                                <div className="best-move">
                                  <span className="best-label">Best move:</span>
                                  <strong>{analysis.bestMove}</strong>
                                  <span className="best-eval">({formatEvaluation(analysis.evaluation)})</span>
                                </div>
                                {analysis.principalVariation && (
                                  <div className="principal-variation">
                                    <span className="pv-label">Best line:</span>
                                    <span className="pv-moves">
                                      {analysis.principalVariation.slice(0, 8).join(' ')}
                                      {analysis.principalVariation.length > 8 && '...'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            </div>
          </div>
        </>
      )}

      {!isAnalyzing && moveAnalyses.length === 0 && fullGamePgn.length > 0 && (
        <div className="no-analysis">
          <p>Click "Analyze Game" to get detailed move analysis with quality assessment.</p>
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