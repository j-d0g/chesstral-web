import React, { useEffect, useState, useRef } from 'react';
import { Chess } from 'chess.js';
import Chessboard from 'chessboardjsx';
import EngineSelector from './EngineSelector';

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
  const [chess, setChess] = useState<Chess>(new Chess());
  const [playerTurn, setPlayerTurn] = useState<'w' | 'b'>('w');
  const [selectedEngine, setSelectedEngine] = useState<string>('open-mistral-7b');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [moveNumber, setMoveNumber] = useState<number>(1);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  const handleMove = (move: Move) => {
    // Handle the move logic here
    const result = chess.move(move);
    if (result) {
      setChess(new Chess(chess.fen()));
      setPlayerTurn(playerTurn === 'w' ? 'b' : 'w');

      // Add your move to the chat history
      const moveNumber = Math.floor((chess.history().length + 1) / 2);
      setChatHistory((prevHistory) => [
        ...prevHistory,
        {
          engineName: 'You',
          moveNumber: `${moveNumber}.`,
          moveSequence: chess.pgn().split(/\d+\./).pop()?.trim() || '',
          commentary: '',
        },
      ]);
    }
    // Handle game won by user
    if (playerTurn === 'b' && !chess.isCheckmate()) {
      fetchComputerMove();
    }
  };

  const fetchComputerMove = async () => {
    const response = await fetch('http://127.0.0.1:5000/api/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fen: chess.fen(), engine: selectedEngine }),
    });

    if (response.ok) {
      const data = await response.json();
      const move = data.move;
      const result = chess.move(move);
      const commentary = data.thoughts;
      if (result) {
        setChess(new Chess(chess.fen()));
        setPlayerTurn('w');
        const moveNumber = Math.floor((chess.history().length + 1) / 2);
        setChatHistory((prevHistory) => [
          ...prevHistory,
          {
            engineName: selectedEngine,
            moveNumber: chess.turn() === 'w' ? `${moveNumber}.` : '',
            moveSequence: chess.pgn().split(/\d+\./).pop()?.trim() || '',
            commentary,
          },
        ]);
      }
    }
  };

  useEffect(() => {
    if (playerTurn === 'b') {
      fetchComputerMove();
    }
  }, [playerTurn]);

  const handleGameOver = () => {
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        alert('Checkmate!');
      } else if (chess.isDraw()) {
        alert('Draw!');
      } else if (chess.isStalemate()) {
        alert('Stalemate!');
      } else if (chess.isThreefoldRepetition()) {
        alert('Threefold Repetition!');
      } else if (chess.isInsufficientMaterial()) {
        alert('Insufficient Material!');
      }
    }
  };

  useEffect(() => {
    handleGameOver();
  }, [chess]);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return (
    <div style={{ display: 'flex', backgroundColor: '#1c1c1c', color: '#fff', padding: '20px' }}>
      <div style={{marginRight: '20px', marginTop: '5px'}}>
        <div style={{marginBottom: '10px'}}>
          <EngineSelector selectedEngine={selectedEngine} onEngineChange={setSelectedEngine}/>
        </div>
        <Chessboard
            position={chess.fen()}
            onDrop={(move: any) =>
                handleMove({
                  from: move.sourceSquare,
                  to: move.targetSquare,
                  promotion: 'q',
                })
            }
            boardStyle={{
              borderRadius: '5px',
              boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`,
            }}
            darkSquareStyle={{backgroundColor: '#779952'}}
            lightSquareStyle={{backgroundColor: '#ebecd0'}}
        />
      </div>
      <div
        ref={chatHistoryRef}
        style={{
          width: '400px',
          height: '600px',
          overflowY: 'scroll',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#2c2c2c',
          padding: '10px',
          borderRadius: '5px',
        }}
      >
        <h3>Chat with {selectedEngine}:</h3>
        {chatHistory.map((message, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            <strong>{message.engineName}:</strong>
            <p>
              {message.moveNumber} {message.moveSequence}
            </p>
            <p>{message.commentary}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Board;