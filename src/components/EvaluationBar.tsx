// EvaluationBar.tsx

import React from 'react';
import '../styles/EvaluationBar.css';

type EvaluationBarProps = {
  score: number;
  turn: 'w' | 'b';
};

const EvaluationBar: React.FC<EvaluationBarProps> = ({ score, turn }) => {
  const getWhitePercentage = (score: number, turn: 'w' | 'b') => {
    const maxScore = 10;
    const adjustedScore = turn === 'b' ? -score : score;
    const normalizedScore = Math.min(Math.max(adjustedScore, -maxScore), maxScore);
    const percentage = ((normalizedScore + maxScore) / (maxScore * 2)) * 100;
    return percentage;
  };

  const whitePercentage = getWhitePercentage(score, turn);

  return (
    <div className="evaluation-bar">
      <div
        className="evaluation-bar-white"
        style={{ width: `${whitePercentage}%` }}
      />
    </div>
  );
};

export default EvaluationBar;