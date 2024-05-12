// Board.tsx
import React from 'react';
import useChess from '../hooks/useChess';
import Chessboard from 'chessboardjsx';
import ControlPanel from './ControlPanel';
import CommentaryBox from './CommentaryBox';
import BoardImporter from "./BoardImporter";
import EvaluationBar from "./EvaluationBar";
import '../styles/Board.css';

const Board: React.FC = () => {
  const {
    board,
    selectedEngine,
    contextOn,
    commentaryBoxRef,
    commentaryHistory,
    evalScore,
    setSelectedEngine,
    toggleContext,
    resetBoard,
    handleFenInput,
    handlePgnInput,
    handleMove,
    handleRatingSubmit,
  } = useChess();

  console.log(evalScore)

  return (
    <div className="board-container">
      <div className="board-wrapper">
        <div className="left-panel">
          <ControlPanel
              selectedEngine={selectedEngine}
              setSelectedEngine={setSelectedEngine}
              contextOn={contextOn}
              toggleContext={toggleContext}
              resetBoard={resetBoard}
          />
          <Chessboard
              position={board.fen()}
              onDrop={(move: any) =>
                  handleMove({
                    from: move.sourceSquare,
                    to: move.targetSquare,
                    promotion: 'q',
                  })
              }
              boardStyle={{
                borderRadius: '5px',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
              }}
              darkSquareStyle={{backgroundColor: '#779952'}}
              lightSquareStyle={{backgroundColor: '#ebecd0'}}
          />
          <BoardImporter
              handleFenInput={handleFenInput}
              handlePgnInput={handlePgnInput}
              fen={board.fen()}
              pgn={board.pgn()}
          />
          <EvaluationBar score={evalScore} turn={board.turn()}/>
        </div>
        <CommentaryBox
            commentaryBoxRef={commentaryBoxRef}
            commentaryHistory={commentaryHistory}
          onRatingSubmit={handleRatingSubmit}
        />
      </div>
    </div>
  );
};

export default Board;