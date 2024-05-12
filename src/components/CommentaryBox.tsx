import React, { useEffect, useRef, useState } from 'react';
import '../styles/CommentaryBox.css';
import { CommentaryMessage } from '../types/CommentaryMessage';
import RatingForm from './RatingForm';
import {saveRating} from "../server/ChessAPIServer";
import {RatingJSON} from "../types/RatingJSON";

type CommentaryBoxProps = {
  commentaryHistory: CommentaryMessage[];
  commentaryBoxRef: React.RefObject<HTMLDivElement>;
  onRatingSubmit: (index: number) => void;
  uuid: string;
};

const CommentaryBox: React.FC<CommentaryBoxProps> = ({ commentaryHistory, commentaryBoxRef, onRatingSubmit, uuid }) => {
  const [expandedMessageIndex, setExpandedMessageIndex] = useState<number | null>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);

  useEffect(() => {
    if (commentaryBoxRef.current) {
      commentaryBoxRef.current.scrollTop = commentaryBoxRef.current.scrollHeight;
    }
  }, [commentaryHistory]);

  useEffect(() => {
    if (expandedMessageIndex !== null && messageRefs.current[expandedMessageIndex]) {
      const messageElement = messageRefs.current[expandedMessageIndex];
      const commentaryBoxElement = commentaryBoxRef.current;

      if (messageElement && commentaryBoxElement) {
        const messageBottom = messageElement.offsetTop + messageElement.offsetHeight;
        const commentaryBoxBottom = commentaryBoxElement.scrollTop + commentaryBoxElement.clientHeight;

        if (messageBottom > commentaryBoxBottom) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    }
  }, [expandedMessageIndex, commentaryHistory]);

   const handleMessageMouseEnter = (index: number) => {
    setHoveredMessageIndex(index);
  };

  const handleMessageMouseLeave = () => {
    setHoveredMessageIndex(null);
  };

  const handleMessageClick = (event: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (!(event.target as HTMLElement).closest('.rating-form')) {
      setExpandedMessageIndex(expandedMessageIndex === index ? null : index);
    }
  };


  const handleRatingSubmit = (uuid: string, rating: {quality: number; correctness: number; relevance: number; salience: number; review: string }, index: number) => {
    const message = commentaryHistory[index];
    const ratingJSON: RatingJSON = {
      uuid: uuid,
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

    saveRating(ratingJSON);
    onRatingSubmit(index);
    setExpandedMessageIndex(null);
  };

  return (
    <div ref={commentaryBoxRef} className="commentary-box">
      {commentaryHistory.map((message, index) => (
        <div
          key={index}
          ref={(el) => (messageRefs.current[index] = el)}
          className={`commentary-message ${index === expandedMessageIndex ? 'expanded' : ''} ${
            index === hoveredMessageIndex ? 'hovered' : ''
          }`}
          onClick={(event) => handleMessageClick(event, index)}
          onMouseEnter={() => handleMessageMouseEnter(index)}
          onMouseLeave={handleMessageMouseLeave}
        >
          <div className="message-content">
            <div className="message-header">
              <strong>{message.engineName}:</strong>
              {message.reviewed && (
                  <span className="reviewed-message">
                <span className="tick"> ✓ </span>
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
              <RatingForm onSubmit={(rating) => handleRatingSubmit(uuid, rating, index)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CommentaryBox;