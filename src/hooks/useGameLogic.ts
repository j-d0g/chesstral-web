// useChessGame.ts
import {useEffect, useRef, useState} from 'react';
import {Chess, Move as ChessMove} from 'chess.js';
import {CommentaryMessage} from '../types/CommentaryMessage';
import {BoardMove} from "../types/BoardMove";

function useGameLogic() {
  const [board, setBoard] = useState<Chess>(new Chess());
  const [selectedEngine, setSelectedEngine] = useState<string>('open-mistral-7b');
  const [commentaryHistory, setCommentaryHistory] = useState<CommentaryMessage[]>([]);
  const [contextOn, setContextOn] = useState<boolean>(false);
  const [conversation, setConversation] = useState<[]>([]);
  const commentaryHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    handleGameOver();
  }, [board]);

  useEffect(() => {
    if (commentaryHistoryRef.current) {
      commentaryHistoryRef.current.scrollTop = commentaryHistoryRef.current.scrollHeight;
    }
  }, [commentaryHistory]);
  const handleUpdateBoard = (newBoard: Chess) => {
    setBoard(newBoard);
    if (newBoard.turn() === 'b') {
      fetchComputerMove(newBoard);
    }
  };

  const handleMove = (move: BoardMove, commentary: string = "", engine: string = "You") => {
    const newBoard = board;
    try {
      const result = newBoard.move(move);
      handleUpdateBoard(newBoard);
      addCommentaryMessage(engine, newBoard, result, commentary);
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
      const commentary = data.prompt.completion.thoughts;
      setConversation(data.prompt.context);
      handleMove(move, commentary, selectedEngine)
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
        console.log(pgnString)
        newBoard.loadPgn(pgnString);
        console.log(newBoard.pgn())
        console.log(newBoard.history().pop())
        handleUpdateBoard(newBoard);
      } catch (error) {
        alert('Invalid PGN sequence');
      }
    }
  };

  const addCommentaryMessage = (engineName: string, currentBoard: Chess, move: ChessMove, commentary: string) => {
    const moveNumber = Math.ceil((currentBoard.history().length) / 2);
    const moveSequence = currentBoard.pgn().split(/\d+\./).pop()?.trim() || '';
    setCommentaryHistory((prevHistory) => [
      ...prevHistory,
      {
        engineName,
        moveNumber: board.turn() === 'b' ? `${moveNumber}.` : `${moveNumber}...`,
        moveSequence: board.turn() === 'b' ? moveSequence : moveSequence.split(' ')[1],
        commentary: commentary,
      },
    ]);
  };

  const toggleContext = () => {
    setContextOn(!contextOn);
  };

  const resetBoard = () => {
    setConversation([]);
    setCommentaryHistory([]);
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

  return {
    board, selectedEngine, commentaryHistory, conversation, contextOn, commentaryBoxRef: commentaryHistoryRef,
    handlePgnInput, handleFenInput, setSelectedEngine, toggleContext, resetBoard, handleMove, handleUpdateBoard
  };
}

export default useGameLogic;