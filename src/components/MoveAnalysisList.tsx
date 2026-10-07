import React, { useState } from 'react'
import type { MoveAnalysis, MoveClassification } from '../utils/analysis'
import { formatEvaluation } from '../utils/evaluation'

interface MoveAnalysisListProps {
  analyses: MoveAnalysis[]
  currentMoveIndex: number
  onSelectMove: (index: number) => void
}

const styles: Record<MoveClassification, { color: string; symbol: string; label: string }> = {
  best: { color: '#22c55e', symbol: '!!', label: 'Best Move' },
  excellent: { color: '#16a34a', symbol: '!', label: 'Excellent' },
  good: { color: '#65a30d', symbol: '', label: 'Good' },
  inaccuracy: { color: '#eab308', symbol: '?!', label: 'Inaccuracy' },
  mistake: { color: '#f97316', symbol: '?', label: 'Mistake' },
  blunder: { color: '#ef4444', symbol: '??', label: 'Blunder' },
  book: { color: '#3b82f6', symbol: '📖', label: 'Book' },
}

const MoveAnalysisList: React.FC<MoveAnalysisListProps> = ({
  analyses,
  currentMoveIndex,
  onSelectMove,
}) => {
  const [expandedMove, setExpandedMove] = useState<number | null>(null)

  return (
    <div className="analyzed-moves">
      <h4>🎯 Move Analysis</h4>
      <div className="moves-list-container">
        <div className="moves-list">
          {analyses.map((analysis, index) => {
            const style = styles[analysis.classification]
            const expanded = expandedMove === index
            const canExpand = Boolean(analysis.bestMove || analysis.openingInfo)

            return (
              <div
                key={`${analysis.fen}-${index}`}
                className={`move-analysis-item ${index === currentMoveIndex ? 'current' : ''} ${analysis.classification}`}
                style={{ backgroundColor: `${style.color}1a` }}
              >
                <div
                  className="move-summary"
                  onClick={() => onSelectMove(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onSelectMove(index)
                  }}
                >
                  <span className="move-number">
                    {index % 2 === 0 ? `${Math.ceil((index + 1) / 2)}.` : `${Math.ceil((index + 1) / 2)}...`}
                  </span>
                  <span className="move-notation">{analysis.move}</span>
                  <span className="move-classification" style={{ color: style.color }}>
                    {style.symbol}
                  </span>
                  <span className="move-accuracy" style={{ color: style.color }}>
                    {analysis.accuracy.toFixed(0)}%
                  </span>
                  <span className="move-evaluation">
                    {analysis.classification === 'book' && analysis.openingInfo
                      ? analysis.openingInfo.eco
                      : formatEvaluation(analysis.evaluation, analysis.mate)}
                  </span>
                  {canExpand && (
                    <button
                      className="expand-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        setExpandedMove(expanded ? null : index)
                      }}
                      title="Show details"
                    >
                      {expanded ? '▼' : '▶'}
                    </button>
                  )}
                </div>

                {expanded && (
                  <div className="move-details">
                    {analysis.openingInfo ? (
                      <div className="opening-info">
                        <strong>{analysis.openingInfo.name}</strong>
                        <div>ECO: {analysis.openingInfo.eco}</div>
                        <div className="opening-line">
                          <span className="pv-label">Line:</span>
                          <span className="pv-moves">{analysis.openingInfo.pgn}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="move-quality-details">
                          <div className="quality-row">
                            <span className="quality-label">Classification:</span>
                            <span className="quality-value" style={{ color: style.color }}>
                              {style.label}
                            </span>
                          </div>
                          <div className="quality-row">
                            <span className="quality-label">Win chance loss:</span>
                            <span className="quality-value" style={{ color: style.color }}>
                              -{(analysis.winChanceLoss * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        {analysis.bestMove && (
                          <div className="best-move-info">
                            <strong>Best move: {analysis.bestMove}</strong>
                            {analysis.principalVariation && (
                              <div className="principal-variation">
                                <span className="pv-label">Best line:</span>
                                <span className="pv-moves">
                                  {analysis.principalVariation.slice(0, 8).join(' ')}
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
  )
}

export default MoveAnalysisList
