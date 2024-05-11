// CommentaryBox.tsx

import React, { useEffect } from 'react';
import '../styles/CommentaryBox.css';
import { CommentaryMessage } from '../types/CommentaryMessage';

type CommentaryBoxProps = {
    commentaryHistory: CommentaryMessage[];
    selectedEngine: string;
    commentaryBoxRef: React.RefObject<HTMLDivElement>;
};

const CommentaryBox: React.FC<CommentaryBoxProps> = ({
    commentaryHistory,
    selectedEngine,
    commentaryBoxRef
}) => {

  useEffect(() => {
    if (commentaryBoxRef.current) {
      commentaryBoxRef.current.scrollTop = commentaryBoxRef.current.scrollHeight;
    }
  }, [commentaryHistory]);

  return (
    <div ref={commentaryBoxRef} className="commentary-box">
      {/*<h2>{selectedEngine.toUpperCase()}</h2>*/}
      {commentaryHistory.map((message, index) => (
        <div key={index} className="commentary-message">
          <strong>{message.engineName}:</strong>
          <p>
            {message.moveNumber} {message.moveSequence}
          </p>
          <p>{message.commentary}</p>
        </div>
      ))}
    </div>
  );
};

export default CommentaryBox;