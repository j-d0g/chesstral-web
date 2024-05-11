// CommentaryBox.tsx
import React, { useEffect, useState } from 'react';
import '../styles/CommentaryBox.css';
import { CommentaryMessage } from '../types/CommentaryMessage';
import RatingForm from './RatingForm';
import {RatingJSON} from "../types/RatingJSON";
import {submitRating} from "../Server/ChessAPIServer";

type CommentaryBoxProps = {
  commentaryHistory: CommentaryMessage[];
  commentaryBoxRef: React.RefObject<HTMLDivElement>;
  onRatingSubmit: (index: number) => void;
};

const CommentaryBox: React.FC<CommentaryBoxProps> = ({ commentaryHistory, commentaryBoxRef, onRatingSubmit }) => {
  const [expandedMessageIndex, setExpandedMessageIndex] = useState<number | null>(null);

  useEffect(() => {
    if (commentaryBoxRef.current) {
      commentaryBoxRef.current.scrollTop = commentaryBoxRef.current.scrollHeight;
    }
  }, [commentaryHistory]);

  const handleMessageClick = (event: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (!(event.target as HTMLElement).closest('.rating-form')) {
      setExpandedMessageIndex(expandedMessageIndex === index ? null : index);
    }
  };

const handleRatingSubmit = (rating: { quality: number; correctness: number; relevance: number; salience: number; review: string }, index: number) => {
  const message = commentaryHistory[index];
  const ratingJSON: RatingJSON = {
    engineName: message.engineName,
    fen: message.fen,
    move: message.move,
    moveSequence: message.moveSequence,
    commentary: message.commentary,
    quality: rating.quality,
    correctness: rating.correctness,
    relevance: rating.relevance,
    salience: rating.salience,
    review: rating.review,
  };

  submitRating(ratingJSON);
  onRatingSubmit(index);
  setExpandedMessageIndex(null);

};

  return (
    <div ref={commentaryBoxRef} className="commentary-box">
      {commentaryHistory.map((message, index) => (
        <div
          key={index}
          className={`commentary-message ${index === expandedMessageIndex ? 'expanded' : ''}`}
          onClick={(event) => handleMessageClick(event, index)}
        >
          <div className="message-content">
            <div className="message-header">
              <strong>{message.engineName}:</strong>
              {message.reviewed && (
                <span className="reviewed-message">
                  <span className="tick"> ✓</span>
                </span>
              )}
            </div>
            <p>
              {message.moveNumber} {message.moveSequence}
            </p>
            <p>{message.commentary}</p>
          </div>
          {index === expandedMessageIndex && (
            <div className="rating-form-container">
              <RatingForm onSubmit={(rating) => handleRatingSubmit(rating, index)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CommentaryBox;