// Board.tsx

import React, { useEffect, useState, useRef } from 'react';
import { Chess, Move as ChessMove } from 'chess.js';
import Chessboard from 'chessboardjsx';
import EngineSelector from './EngineSelector';
import '../styles/Board.css';

type Move = {
  from: string;
  to: string;
  promotion?: string;
};

type ChatMessage = {
  engineName: string;
  moveNumber: string;
  moveSequence: string;
  commentary: string;
};

const Board: React.FC = () => {
  const [board, setBoard] = useState<Chess>(new Chess());
  const [selectedEngine, setSelectedEngine] = useState<string>('open-mistral-7b');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const [contextOn, setContextOn] = useState<boolean>(false);
  const [conversation, setConversation] = useState<[]>([]);

  useEffect(() => {
    handleGameOver();
  }, [board]);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleUpdateBoard = (newBoard: Chess) => {
    setBoard(newBoard);
    if (newBoard.turn() === 'b') {
      fetchComputerMove(newBoard);
    }
  };

  const handleMove = (move: Move) => {
    const newBoard = board;
    try {
      const result = newBoard.move(move);
      handleUpdateBoard(newBoard);
      addChatMessage('You', newBoard, result);
    } catch (error) {}
  };

  const fetchComputerMove = async (currentBoard: Chess) => {
    const context = contextOn ? conversation : [];
    const pgnMoves = currentBoard.history();
    const response = await fetch('http://127.0.0.1:5000/api/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fen: currentBoard.fen(),
        engine: selectedEngine,
        pgn: pgnMoves,
        context: context,
      }),
    });
    if (response.ok) {
      const data = await response.json();
      const move = data.prompt.completion.move;
      const newBoard = board;
      const result = newBoard.move(move);
      if (result) {
        handleUpdateBoard(newBoard);
        addChatMessage(selectedEngine, newBoard, result, data.prompt.completion.thoughts);
        setConversation(data.prompt.context);
      }
    }
  };

  const addChatMessage = (engineName: string, currentBoard: Chess, move: ChessMove, commentary?: string) => {
    const moveNumber = Math.ceil((currentBoard.history().length) / 2);
    const moveSequence = currentBoard.pgn().split(/\d+\./).pop()?.trim() || '';
    setChatHistory((prevHistory) => [
      ...prevHistory,
      {
        engineName,
        moveNumber: `${moveNumber}.`,
        moveSequence,
        commentary: commentary || '',
      },
    ]);
  };

  const toggleContext = () => {
    setContextOn(!contextOn);
  };

  const resetBoard = () => {
    setConversation([]);
    setChatHistory([]);
    handleUpdateBoard(new Chess());
  };

  const handleGameOver = () => {
    if (board.isGameOver()) {
      if (board.isCheckmate()) {
        alert('Checkmate!');
      } else if (board.isDraw()) {
        alert('Draw!');
      } else if (board.isStalemate()) {
        alert('Stalemate!');
      } else if (board.isThreefoldRepetition()) {
        alert('Threefold Repetition!');
      } else if (board.isInsufficientMaterial()) {
        alert('Insufficient Material!');
      }
    }
  };

  return (
    <div className="board-container">
      <div className="board-wrapper">
        <div className="board-controls">
          <div className="engine-selector">
            <EngineSelector selectedEngine={selectedEngine} onEngineChange={setSelectedEngine} />
          </div>
          <div className="board-buttons">
            <button onClick={resetBoard}>Reset Board</button>
            <button
              onClick={toggleContext}
              className={`context-button ${contextOn ? 'on' : ''}`}
            >
              {contextOn ? 'Context On' : 'Context Off'}
            </button>
          </div>
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
            darkSquareStyle={{ backgroundColor: '#779952' }}
            lightSquareStyle={{ backgroundColor: '#ebecd0' }}
          />
          <div className="board-importer">
            <input
              type="text"
              name="fen"
              placeholder="Enter FEN string"
              className="fen-input"
              onChange={(event) => {
                const newBoard = new Chess(event.target.value);
                if (newBoard.fen() === event.target.value) {
                  handleUpdateBoard(newBoard);
                } else {
                  alert('Invalid FEN string');
                }
              }}
              value={board.fen()}
            />
            <input
              type="text"
              name="pgn"
              placeholder="Enter PGN sequence"
              className="pgn-input"
              onChange={(event) => {
                const newBoard = new Chess();
                try {
                  newBoard.loadPgn(event.target.value);
                  handleUpdateBoard(newBoard);
                } catch (error) {
                  alert('Invalid PGN sequence');
                }
              }}
              value={board.pgn()}
            />
          </div>
        </div>
        <div ref={chatHistoryRef} className="chat-history">
          <h2>{selectedEngine.toUpperCase()}</h2>
          {chatHistory.map((message, index) => (
            <div key={index} className="chat-message">
              <strong>{message.engineName}:</strong>
              <p>
                {message.moveNumber} {message.moveSequence}
              </p>
              <p>{message.commentary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Board;