import React, {useEffect, useState} from 'react';
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

  useEffect(() => {
    checkRatingFilled();
  }, [quality, correctness, relevance, salience]);

  const [isRatingFilled, setIsRatingFilled] = useState(false);
  const checkRatingFilled = () => {
    setIsRatingFilled(quality > 0 && correctness > 0 && relevance > 0 && salience > 0);

  };
  const handleStarClick = (category: string, value: number) => {
    switch (category) {
      case 'quality':
        setQuality(value);
        break;
      case 'correctness':
        setCorrectness(value);
        break;
      case 'relevance':
        setRelevance(value);
        break;
      case 'salience':
        setSalience(value);
        break;
      default:
        break;
    }
  };

  const renderStars = (category: string, value: number) => {
    const stars = [];
    for (let i = 5; i >= 1; i--) {
      stars.push(
        <span
          key={i}
          className={`star ${i <= value ? 'filled' : ''}`}
          onClick={() => handleStarClick(category, i)}
        >
          &#9733;
        </span>
      );
    }
    return stars;
  };

  const handleReviewChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReview(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ quality, correctness, relevance, salience, review });
  };

  return (
    <form className="rating-form" onSubmit={handleSubmit}>
      <div className="rating-item">
        <label>Move Quality:</label>
        <div className="star-rating">{renderStars('quality', quality)}</div>
      </div>
      <div className="rating-item">
        <label>Move Responsiveness:</label>
        <div className="star-rating">{renderStars('quality', quality)}</div>
      </div>
      <div className="rating-item">
        <label>Thoughts Correctness:</label>
        <div className="star-rating">{renderStars('correctness', correctness)}</div>
      </div>
      <div className="rating-item">
        <label>Thoughts Relevance:</label>
        <div className="star-rating">{renderStars('relevance', relevance)}</div>
      </div>
      <div className="rating-item">
        <label>Thoughts Salience:</label>
        <div className="star-rating">{renderStars('salience', salience)}</div>
      </div>
      <div className="rating-item">
        <label htmlFor="review">Review:</label>
        <textarea
          id="review"
          value={review}
          onChange={handleReviewChange}
            placeholder="
            MOVE QUALITY - How good/human-like the move was for a beginner.
            MOVE RESPONSIVENESS - How attentively the move appears to respond to the current board-state / previous move(s).
            THOUGHTS CORRECTNESS - How factually accurate the comments were.
            THOUGHTS RELEVANCE - How relevant the comments were to the move made.
            THOUGHTS SALIENCE - How useful were the comments, i.e did they place attention on the right things?"
        ></textarea>
      </div>
      <button type="submit" disabled={!isRatingFilled}>
        Submit
      </button>
    </form>
  );
};

export default RatingForm;