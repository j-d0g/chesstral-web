import React from 'react'
import type { MoveAnalysis } from '../utils/analysis'

interface AdvantageGraphProps {
  analyses: MoveAnalysis[]
  onSelectMove: (index: number) => void
}

const AdvantageGraph: React.FC<AdvantageGraphProps> = ({ analyses, onSelectMove }) => {
  if (analyses.length === 0) return null

  const points = analyses.map((analysis, index) => {
    const x = analyses.length === 1 ? 300 : (index / (analyses.length - 1)) * 600
    const score = analysis.mate != null
      ? analysis.mate === 0 ? Math.sign(analysis.evaluation) * 3 : Math.sign(analysis.mate) * 3
      : Math.max(-3, Math.min(3, analysis.evaluation))
    return { x, y: 100 - score * 33, classification: analysis.classification }
  })

  return (
    <div className="advantage-graph">
      <h4>📈 Advantage Graph</h4>
      <div className="graph-container">
        <svg
          width="100%"
          height="200"
          className="advantage-chart"
          viewBox="0 0 600 200"
          role="img"
          aria-label="Evaluation by move"
        >
          <rect width="600" height="200" fill="rgba(0, 0, 0, 0.3)" rx="8" />
          <line x1="0" y1="50" x2="600" y2="50" stroke="rgba(255,255,255,0.1)" />
          <line x1="0" y1="100" x2="600" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
          <line x1="0" y1="150" x2="600" y2="150" stroke="rgba(255,255,255,0.1)" />
          {points.length > 1 && (
            <polyline
              points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {points.map(({ x, y, classification }, index) => (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="5"
              fill={classification === 'blunder' ? '#ef4444' : classification === 'book' ? '#3b82f6' : '#22c55e'}
              stroke="white"
              strokeWidth="2"
              className="graph-point"
              onClick={() => onSelectMove(index)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          <text x="15" y="30" fill="rgba(255,255,255,0.7)" fontSize="14">+3</text>
          <text x="15" y="105" fill="rgba(255,255,255,0.7)" fontSize="14">0</text>
          <text x="15" y="180" fill="rgba(255,255,255,0.7)" fontSize="14">-3</text>
        </svg>
      </div>
    </div>
  )
}

export default AdvantageGraph
