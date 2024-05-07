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
  const [board, setBoard] = useState<Chess>(new Chess());
  const [playerTurn, setPlayerTurn] = useState<'w' | 'b'>('w');
  const [selectedEngine, setSelectedEngine] = useState<string>('open-mistral-7b');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [fen, setFen] = useState<string>(new Chess().fen());
  const [pgnMoves, setPgnMoves] = useState<string[]>([]);
  const [pgnStr, setPgnStr] = useState<string>('');
  const [moveNum, setMoveNum] = useState<number>(0);
  const [contextOn, setContextOn] = useState<boolean>(false);
  const [conversation, setConversation] = useState<[]>([]);

  const handleUpdateFen = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const new_board = new Chess(fen);
      if (new_board.fen() === fen) {
        resetBoard()
        setBoard(new_board);
        setPlayerTurn(new_board.turn() as 'w' | 'b');
      } else {
        alert('Invalid FEN string');
      }
    }
  }


  const handleUpdatePGN = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const chess = new Chess();
      try {
        chess.loadPgn(pgnStr);
        resetBoard()
        setBoard(chess);
        setPlayerTurn(chess.turn() as 'w' | 'b');
      } catch (error) {
        alert('Invalid PGN sequence');
      }
    }
  }

  const handleMove = (move: Move) => {
    setFen(board.fen())
    try {
      const result = board.move(move);
      if (result) {
        setBoard(new Chess(board.fen()));
        setPlayerTurn(playerTurn === 'w' ? 'b' : 'w');
        setLastMove(move)
        const moveStr = board.pgn().split(/\d+\./).pop()?.trim() || ''
        const moveNumber = moveNum + 1
        setPgnMoves(pgnMoves.concat(moveStr))
        setPgnStr(pgnStr + moveNumber + '. ' + moveStr + ' ')
        setFen(board.fen())
        setChatHistory((prevHistory) => [
          ...prevHistory,
          {
            engineName: 'You',
            moveNumber: `${moveNumber}.`,
            moveSequence: moveStr,
            commentary: '',
          },
        ]);
      }
    } catch (error) {
      return
    }

    // Pass the last move to the fetchComputerMove function
    if (!board.isGameOver() && playerTurn === 'b') {
      fetchComputerMove(move);
    }
  };

  const fetchComputerMove = async (lastMove: Move) => {
    const context = contextOn ? conversation : []
    const response = await fetch('http://127.0.0.1:5000/api/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fen: fen,
        engine: selectedEngine,
        pgn: pgnMoves,
        lastMove: lastMove, // Include the last move in the request payload
        context: context,

      }),
    });
    if (response.ok) {
      const data = await response.json();
      const move = data.prompt.completion.move;
      const result = board.move(move);
      const commentary = data.prompt.completion.thoughts;
      const pgn = data.board.pgn
      const moveNumber = (data.board.move_num + 1) / 2
      setConversation(data.prompt.context)

      if (result) {
        setPgnMoves(pgnMoves.concat(move))
        setPgnStr(pgnStr + move + ' ')
        setMoveNum(moveNumber)
        setBoard(new Chess(board.fen()));
        setPlayerTurn('w');
        setChatHistory((prevHistory) => [
          ...prevHistory,
          {
            engineName: selectedEngine,
            moveNumber: board.turn() === 'w' ? `${moveNumber}.` : '',
            moveSequence: board.pgn().split(/\d+\./).pop()?.trim() || '',
            commentary,
          },
        ]);
      }
    }
  };

  const toggleContext = () => {
    setContextOn(!contextOn);
  };

  const resetBoard = async () => {
    setConversation([])
    setMoveNum(0)
    setPgnMoves([])
    setPgnStr('')
    setChatHistory([])
    setBoard(new Chess());
    setPlayerTurn('w');
    setLastMove(null);
    setFen(new Chess().fen());
  };

  useEffect(() => {
    if (playerTurn === 'b' && lastMove) {
      fetchComputerMove(lastMove);
    }
  }, [playerTurn, lastMove]);

  useEffect(() => {
    resetBoard();
  }, []);

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

  useEffect(() => {
    handleGameOver();
  }, [board]);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#1c1c1c', color: '#fff', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ marginRight: '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <EngineSelector selectedEngine={selectedEngine} onEngineChange={setSelectedEngine} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <button onClick={resetBoard}>Reset Board</button>
            <button
              onClick={toggleContext}
              style={{
                backgroundColor: contextOn ? 'green' : 'grey',
                marginLeft: '10px',
              }}
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
              boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`,
            }}
            darkSquareStyle={{ backgroundColor: '#779952' }}
            lightSquareStyle={{ backgroundColor: '#ebecd0' }}
          />
          <input
            type="text"
            name="fen"
            placeholder="Enter FEN string"
            style={{ marginTop: '10px', width: '99%' }}
            onChange={(event) => setFen(event.target.value)}
            onKeyDown={handleUpdateFen}
            value={fen}
          />
          <input
            type="text"
            name="pgn"
            placeholder="Enter PGN sequence"
            style={{ marginTop: '7px', width: '99%' }}
            onChange={(event) => setPgnStr(event.target.value)}
            onKeyDown={handleUpdatePGN}
            value={pgnStr}
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
            marginTop: '60px',
            marginBottom: '5px',
          }}
        >
          <h2 style={{ textAlign: 'center' }}>{selectedEngine.toUpperCase()}</h2>
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
    </div>
  );
};

export default Board;