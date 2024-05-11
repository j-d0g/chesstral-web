// RatingForm.tsx
import React, { useState } from 'react';
import '../styles/RatingForm.css';

type RatingFormProps = {
  onSubmit: (rating: { quality: number; correctness: number; relevance: number; salience: number; review: string }) => void;
};

const RatingForm: React.FC<RatingFormProps> = ({ onSubmit }) => {
  const [quality, setQuality] = useState(0);
  const [correctness, setCorrectness] = useState(0);
  const [relevance, setRelevance] = useState(0);
  const [salience, setSalience] = useState(0);
  const [review, setReview] = useState('');
  const [hoverValue, setHoverValue] = useState<{ [key: string]: number | null }>({
    quality: null,
    correctness: null,
    relevance: null,
    salience: null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ quality, correctness, relevance, salience, review });
  };

  const renderStarRating = (value: number, onChange: (rating: number) => void, category: string) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const starValue = i * 5;
      const filled = hoverValue[category] !== null ? hoverValue[category]! >= starValue : value >= starValue;
      stars.push(
        <span
          key={i}
          className={`star ${filled ? 'filled' : ''}`}
          onClick={() => onChange(starValue)}
          onMouseEnter={() => setHoverValue((prevState) => ({ ...prevState, [category]: starValue }))}
          onMouseLeave={() => setHoverValue((prevState) => ({ ...prevState, [category]: null }))}
        >
          ★
        </span>
      );
    }
    return <div className="star-rating">{stars}</div>;
  };

  return (
    <form onSubmit={handleSubmit} className="rating-form">
      <div className="rating-item">
        <label>Quality:</label>
        {renderStarRating(quality, setQuality, 'quality')}
      </div>
      <div className="rating-item">
        <label>Correctness:</label>
        {renderStarRating(correctness, setCorrectness, 'correctness')}
      </div>
      <div className="rating-item">
        <label>Relevance:</label>
        {renderStarRating(relevance, setRelevance, 'relevance')}
      </div>
      <div className="rating-item">
        <label>Salience:</label>
        {renderStarRating(salience, setSalience, 'salience')}
      </div>
      <div className="rating-item">
        <label>Review:</label>
        <textarea value={review} onChange={(e) => setReview(e.target.value)} />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
};

export default RatingForm;