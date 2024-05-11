// useChessGame.ts
import {useEffect, useRef, useState} from 'react';
import {Chess, Move as ChessMove } from 'chess.js';

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

function useChessGame(initialEngine: string) {
  const [board, setBoard] = useState<Chess>(new Chess());
  const [selectedEngine, setSelectedEngine] = useState<string>(initialEngine);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [contextOn, setContextOn] = useState<boolean>(false);
  const [conversation, setConversation] = useState<[]>([]);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

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

  const handleFenInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const fenString = (event.target as HTMLInputElement).value;
      const newBoard = new Chess();
      if (newBoard.fen() === fenString) {
        newBoard.load(fenString);
        handleUpdateBoard(newBoard);
      } else {
        alert('Invalid FEN string');
      }
    }
  };

  const handlePgnInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const pgnString = (event.target as HTMLInputElement).value;
      const newBoard = new Chess();
      try {
        newBoard.loadPgn(pgnString);
        handleUpdateBoard(newBoard);
      } catch (error) {
        alert('Invalid PGN sequence');
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

  return { board, selectedEngine, chatHistory, conversation, contextOn, chatHistoryRef, handlePgnInput, handleFenInput, setSelectedEngine, toggleContext, resetBoard, handleMove, handleUpdateBoard };
}

export default useChessGame;