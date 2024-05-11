// useChessGame.ts
import React, {useEffect, useRef, useState} from 'react';
import {Chess, Move as ChessMove} from 'chess.js';
import {CommentaryMessage} from '../types/CommentaryMessage';
import {BoardMove} from "../types/BoardMove";
import {fetchComputerMove} from "../server/ChessAPIServer";

function useChess() {
  const [board, setBoard] = useState<Chess>(new Chess());
  const [selectedEngine, setSelectedEngine] = useState<string>('open-mistral-7b');
  const [commentaryHistory, setCommentaryHistory] = useState<CommentaryMessage[]>([]);
  const [contextOn, setContextOn] = useState<boolean>(false);
  const [conversation, setConversation] = useState<[]>([]);
  const commentaryHistoryRef = useRef<HTMLDivElement>(null);

  // Hooks
  useEffect(() => {
    handleGameOver();
  }, [board]);

  useEffect(() => {
    if (commentaryHistoryRef.current) {
      commentaryHistoryRef.current.scrollTop = commentaryHistoryRef.current.scrollHeight;
    }
  }, [commentaryHistory]);

  // Game Logic Functions
  const handleMove = async (move: BoardMove | string, commentary: string = "", engine: string = "You") => {
    const newBoard = board;
    try {
      const result = newBoard.move(move);
      handleUpdateBoard(newBoard);
      addCommentaryMessage(engine, newBoard, result, commentary);
    } catch (error) {}
  };

  const handleComputerMove = async (currentBoard: Chess) => {
    const data = await fetchComputerMove(currentBoard, selectedEngine, contextOn, conversation);
    if (data) {
      const { move, thoughts } = data.prompt.completion;
      setConversation(data.prompt.context);
      handleMove(move, thoughts, selectedEngine);
    }
  };

  const handleUpdateBoard = (newBoard: Chess) => {
    setBoard(newBoard);
    if (newBoard.turn() === 'b') {
      handleComputerMove(newBoard);
    }
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

  // Board Importer Functions
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

  // Commentary Box Functions
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
        fen: currentBoard.fen(),
        move: move.san,
        reviewed: false,
      },
    ]);
  };

  const handleRatingSubmit = (index: number) => {
    setCommentaryHistory((prevHistory) => {
      const updatedHistory = [...prevHistory];
      updatedHistory[index] = {
        ...updatedHistory[index],
        reviewed: true,
      };
      return updatedHistory;
    });
  };

  // Control Panel Functions
  const toggleContext = () => {
    setContextOn(!contextOn);
  };

  const resetGame = () => {
    setConversation([]);
    setCommentaryHistory([]);
    handleUpdateBoard(new Chess());
  };

  return {
    board, selectedEngine: selectedEngine, commentaryHistory, conversation, contextOn, commentaryBoxRef: commentaryHistoryRef,
    handlePgnInput, handleFenInput, setSelectedEngine: setSelectedEngine, toggleContext, resetBoard: resetGame, handleMove, handleUpdateBoard, handleRatingSubmit
  };
}

export default useChess;