/**
 * EvaluationBar.tsx - Enhanced Chess Position Evaluation Bar
 * 
 * PURPOSE: Visual representation of position evaluation with detailed information
 * FEATURES: Gradient colors, mate detection, position assessment, responsive design
 */

import React from 'react';
import '../styles/EvaluationBar.css';

interface EvaluationBarProps {
  evaluation: number | null;
}

const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation }) => {
  if (evaluation === null) return null;

  // Handle mate scores
  const isMate = Math.abs(evaluation) > 100;
  const mateIn = isMate ? Math.ceil((1000 - Math.abs(evaluation)) / 2) : 0;

  // Convert evaluation to a percentage for the bar (0-100%)
  let percentage: number;
  let displayValue: string;
  
  if (isMate) {
    // For mate positions, show extreme advantage
    percentage = evaluation > 0 ? 95 : 5;
    displayValue = evaluation > 0 ? `M${mateIn}` : `-M${mateIn}`;
  } else {
  // Clamp between -10 and +10, then normalize to 0-100%
  const clampedEval = Math.max(-10, Math.min(10, evaluation));
    percentage = ((clampedEval + 10) / 20) * 100;
    displayValue = evaluation > 0 ? `+${evaluation.toFixed(2)}` : evaluation.toFixed(2);
  }

  const getEvalColor = (evalValue: number): string => {
    if (isMate) {
      return evalValue > 0 ? '#2E7D32' : '#C62828'; // Dark green/red for mate
    }
    
    const absEval = Math.abs(evalValue);
    if (absEval > 3) return evalValue > 0 ? '#2E7D32' : '#C62828'; // Dark green/red
    if (absEval > 1.5) return evalValue > 0 ? '#388E3C' : '#D32F2F'; // Medium green/red
    if (absEval > 0.5) return evalValue > 0 ? '#689F38' : '#F57C00'; // Light green/orange
    return '#FFA000'; // Amber for equal
  };

  const getPositionText = (evalValue: number): string => {
    if (isMate) {
      return evalValue > 0 ? `White mates in ${mateIn}` : `Black mates in ${mateIn}`;
    }
    
    const absEval = Math.abs(evalValue);
    if (absEval > 3) return evalValue > 0 ? 'White winning' : 'Black winning';
    if (absEval > 1.5) return evalValue > 0 ? 'White much better' : 'Black much better';
    if (absEval > 0.5) return evalValue > 0 ? 'White better' : 'Black better';
    if (absEval > 0.2) return evalValue > 0 ? 'White slightly better' : 'Black slightly better';
    return 'Equal position';
  };

  return (
    <div className="evaluation-bar-container">
      <div className="eval-header">
        <h4>Position Evaluation</h4>
        <div className="eval-display">
          <span className="eval-number" style={{ color: getEvalColor(evaluation) }}>
            {displayValue}
          </span>
        </div>
      </div>
      
      <div className="eval-bar-wrapper">
        {/* Side labels */}
        <div className="eval-labels">
          <span className="eval-label black-label">Black</span>
          <span className="eval-label white-label">White</span>
        </div>
        
        {/* The actual evaluation bar */}
        <div className="eval-bar">
          <div className="eval-bar-background">
            {/* Center line */}
            <div className="eval-center-line"></div>
            
            {/* Evaluation fill */}
          <div 
            className="eval-fill"
            style={{
              width: `${percentage}%`,
                backgroundColor: getEvalColor(evaluation),
                boxShadow: `0 0 10px ${getEvalColor(evaluation)}40`
              }}
            />
            
            {/* Evaluation marker */}
            <div 
              className="eval-marker"
              style={{
                left: `${percentage}%`,
              backgroundColor: getEvalColor(evaluation)
            }}
          />
          </div>
        </div>
        
        {/* Position assessment */}
        <div className="position-assessment">
          <span 
            className="assessment-text"
            style={{ color: getEvalColor(evaluation) }}
          >
            {getPositionText(evaluation)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EvaluationBar;