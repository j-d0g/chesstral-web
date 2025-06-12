// EvaluationBar.tsx

import React from 'react';
import '../styles/EvaluationBar.css';

interface EvaluationBarProps {
  evaluation: number | null;
}

const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation }) => {
  if (evaluation === null) return null;

  // Convert evaluation to a percentage for the bar
  // Clamp between -10 and +10, then normalize to 0-100%
  const clampedEval = Math.max(-10, Math.min(10, evaluation));
  const percentage = ((clampedEval + 10) / 20) * 100;

  const getEvalColor = (evalValue: number) => {
    if (evalValue > 2) return '#4CAF50'; // Green for good position
    if (evalValue > 0.5) return '#8BC34A'; // Light green
    if (evalValue > -0.5) return '#FFC107'; // Yellow for equal
    if (evalValue > -2) return '#FF9800'; // Orange
    return '#F44336'; // Red for bad position
  };

  return (
    <div className="evaluation-bar">
      <h3>Position Evaluation</h3>
      
      <div className="eval-container">
        <div className="eval-bar">
          <div 
            className="eval-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: getEvalColor(evaluation)
            }}
          />
        </div>
        
        <div className="eval-text">
          <span className="eval-value">
            {evaluation > 0 ? '+' : ''}{evaluation.toFixed(2)}
          </span>
          <span className="eval-side">
            {evaluation > 0 ? 'White advantage' : 
             evaluation < 0 ? 'Black advantage' : 'Equal'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EvaluationBar;