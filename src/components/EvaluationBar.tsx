import React from 'react'
import type { Evaluation } from '../utils/evaluation'
import { evaluationWinChance, formatEvaluation } from '../utils/evaluation'
import '../styles/EvaluationBar.css'

interface EvaluationBarProps {
  evaluation: Evaluation | null
}

const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation }) => {
  if (!evaluation) return null

  const { score, mate } = evaluation
  const percentage = Math.max(5, Math.min(95, evaluationWinChance(evaluation) * 100))
  const color = mate != null
    ? score > 0 ? '#2E7D32' : '#C62828'
    : Math.abs(score) > 3
      ? score > 0 ? '#2E7D32' : '#C62828'
      : Math.abs(score) > 1.5
        ? score > 0 ? '#388E3C' : '#D32F2F'
        : Math.abs(score) > 0.5
          ? score > 0 ? '#689F38' : '#F57C00'
          : '#FFA000'
  const positionText = mate === 0
    ? 'Checkmate'
    : mate != null
      ? mate > 0 ? `White mates in ${mate}` : `Black mates in ${Math.abs(mate)}`
      : Math.abs(score) > 3
        ? score > 0 ? 'White winning' : 'Black winning'
        : Math.abs(score) > 1.5
          ? score > 0 ? 'White much better' : 'Black much better'
          : Math.abs(score) > 0.5
            ? score > 0 ? 'White better' : 'Black better'
            : Math.abs(score) > 0.2
              ? score > 0 ? 'White slightly better' : 'Black slightly better'
              : 'Equal position'

  return (
    <div className="evaluation-bar-container">
      <div className="eval-header">
        <h4>Position Evaluation</h4>
        <div className="eval-display">
          <span className="eval-number" style={{ color }}>
            {formatEvaluation(score, mate)}
          </span>
        </div>
      </div>

      <div className="eval-bar-wrapper">
        <div className="eval-labels">
          <span className="eval-label black-label">Black</span>
          <span className="eval-label white-label">White</span>
        </div>
        <div className="eval-bar">
          <div className="eval-bar-background">
            <div className="eval-center-line" />
            <div
              className="eval-fill"
              style={{
                width: `${percentage}%`,
                backgroundColor: color,
                boxShadow: `0 0 10px ${color}40`,
              }}
            />
            <div
              className="eval-marker"
              style={{ left: `${percentage}%`, backgroundColor: color }}
            />
          </div>
        </div>
        <div className="position-assessment">
          <span className="assessment-text" style={{ color }}>
            {positionText}
          </span>
        </div>
      </div>
    </div>
  )
}

export default EvaluationBar
