import React, { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import Chessboard from 'chessboardjsx';
import EngineSelector from './EngineSelector';

type Move = {
  from: string;
  to: string;
  promotion?: string;
};

const Board: React.FC = () => {
    const [chess, setChess] = useState<Chess>(new Chess());
    const [playerTurn, setPlayerTurn] = useState<'w' | 'b'>('w');
    const [selectedEngine, setSelectedEngine] = useState<string>('stockfish');
    const [commentary, setCommentary] = useState<string>('');

    const handleMove = (move: Move) => {
        // Handle the move logic here
        const result = chess.move(move);
        if (result) {
            setChess(new Chess(chess.fen()));
            setPlayerTurn(playerTurn === 'w' ? 'b' : 'w');
        }
        if (playerTurn === 'b') {
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
        
        console.log('from fetchComputerMove: ', selectedEngine)
        
        if (response.ok) {
            const data = await response.json();
            const move = data.move;
            const result = chess.move(move);
            const commentary = data.commentary;
            if (result) {
                setChess(new Chess(chess.fen()));
                setPlayerTurn('w');
                setCommentary(commentary)
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
            const winner = chess.turn() === 'w' ? 'Black' : 'White';
            alert(`Game over! ${winner} wins by checkmate.`);
        } else if (chess.isDraw()) {
            alert('Game over! The game is a draw.');
        }
        }
    };

    useEffect(() => {
        handleGameOver();
    }, [chess]);

  return (
    <div>
        <EngineSelector selectedEngine={selectedEngine} onEngineChange={setSelectedEngine} />
        <Chessboard
        position={chess.fen()}
        onDrop={(move: any) =>
            handleMove({
            from: move.sourceSquare,
            to: move.targetSquare,
            promotion: 'q',
            })
        }
        />
    </div>
  );
};

export default Board;