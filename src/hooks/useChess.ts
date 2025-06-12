// useChessGame.ts
import React, {useEffect, useRef, useState} from 'react';
import {Chess, Move as ChessMove} from 'chess.js';
import {CommentaryMessage} from '../types/CommentaryMessage';
import {BoardMove} from "../types/BoardMove";
import {fetchComputerMove, fetchStockfishScore} from "../server/ChessAPIServer";
import type {StandardizedMoveResponse} from "../server/ChessAPIServer";

type GameState = 'setup' | 'playing' | 'ended';

function useChess() {
  // Core game state
  const [board, setBoard] = useState<Chess>(new Chess());
  const [gameState, setGameState] = useState<GameState>('setup');
  const [selectedEngine, setSelectedEngine] = useState<string>('open-mistral-7b');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  
  // Game metadata
  const [commentaryHistory, setCommentaryHistory] = useState<CommentaryMessage[]>([]);
  const [contextOn, setContextOn] = useState<boolean>(false);
  const [conversation, setConversation] = useState<[]>([]);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [uuid, setUUID] = useState<string>('');
  const [isComputerThinking, setIsComputerThinking] = useState<boolean>(false);
  
  const commentaryHistoryRef = useRef<HTMLDivElement>(null);
  const computerMoveInProgress = useRef<boolean>(false);

  // Auto-scroll commentary
  useEffect(() => {
    if (commentaryHistoryRef.current) {
      commentaryHistoryRef.current.scrollTop = commentaryHistoryRef.current.scrollHeight;
    }
  }, [commentaryHistory]);

  // Handle computer moves when it's their turn
  useEffect(() => {
    console.log('Computer move effect triggered', {
      gameState,
      isGameOver: board.isGameOver(),
      isComputerThinking,
      selectedEngine,
      boardTurn: board.turn(),
      playerColor,
      isComputerTurn: board.turn() !== playerColor,
      boardFEN: board.fen(),
      boardHistory: board.history()
    });
    
    if (gameState === 'playing' && !board.isGameOver() && !isComputerThinking && selectedEngine !== 'You') {
      const isComputerTurn = board.turn() !== playerColor;
      if (isComputerTurn) {
        handleComputerMove();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, gameState, playerColor, selectedEngine]);

  // Check for game over
  useEffect(() => {
    if (gameState === 'playing' && board.isGameOver()) {
      setGameState('ended');
      handleGameOver();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, gameState]);

  // Auto-set player to black when NanoGPT is selected
  useEffect(() => {
    if (selectedEngine.includes('nanogpt') && playerColor === 'w') {
      setPlayerColor('b');
      setBoardOrientation('black');
    }
  }, [selectedEngine, playerColor]);

  // Update board orientation when player color changes
  useEffect(() => {
    setBoardOrientation(playerColor === 'w' ? 'white' : 'black');
  }, [playerColor]);

  // Game Logic Functions
  const handleMove = async (move: BoardMove | string, commentary: string = "", engine: string = "You") => {
    if (gameState !== 'playing' || isComputerThinking) return;
    
    // Don't allow moves when it's not the player's turn (unless it's from the computer)
    if (engine === "You" && board.turn() !== playerColor) return;
    
    try {
      console.log('handleMove called:', { move, engine, currentTurn: board.turn(), playerColor });
      
      // Create a new board instance preserving the game history
      const newBoard = new Chess();
      const currentPgn = board.pgn();
      
      // Load existing moves if any
      if (currentPgn && currentPgn.trim() !== '') {
        newBoard.loadPgn(currentPgn);
      } else {
        // If no PGN, start from current position
        newBoard.load(board.fen());
      }
      
      const result = newBoard.move(move);
      if (result) {
        console.log('Move made successfully', {
          move: result.san,
          newFen: newBoard.fen(),
          newPgn: newBoard.pgn(),
          newHistory: newBoard.history(),
          newTurn: newBoard.turn()
        });
        
        // Update the board state - React will detect this change
        setBoard(newBoard);
        addCommentaryMessage(engine, newBoard, result, commentary);
        updateEvaluation(newBoard.fen());
      } else {
        console.error('Move failed:', move);
      }
    } catch (error) {
      console.error("Invalid move:", error);
    }
  };

  const handleComputerMove = async () => {
    if (isComputerThinking || computerMoveInProgress.current) return;
    
    console.log('handleComputerMove called', {
      board: board.fen(),
      selectedEngine,
      contextOn,
      gameState
    });
    
    computerMoveInProgress.current = true;
    setIsComputerThinking(true);
    
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 15000)
    );
    
    try {
      const data = await Promise.race([
        fetchComputerMove(board, selectedEngine, contextOn, conversation),
        timeoutPromise
      ]) as any;
      
      console.log('Computer move response:', data);
      
      if (data && gameState === 'playing') {
        console.log('Processing move response:', data);
        
        // Check for errors first
        if (!data.success && data.error) {
          console.error('API returned error:', data.error);
          throw new Error(`Move generation failed: ${data.error}`);
        }
        
        // Extract move and thoughts from standardized response
        const move = data.move;
        const thoughts = data.thoughts || '';
        
        console.log('Extracted move from response:', { move, thoughts, confidence: data.confidence });
        
        if (!move) {
          console.error('No move found in response:', data);
          throw new Error('No move returned from engine');
        }
        
        setUUID(data.uuid);
        // For backward compatibility, maintain conversation if it exists in old format
        if (data.prompt?.context) {
          setConversation(data.prompt.context);
        }
        
        await handleMove(move, thoughts, selectedEngine);
        console.log('handleMove completed');
      }
    } catch (error: any) {
      console.error("Error getting computer move:", error);
      
      // If it's a timeout or network error, show a more helpful message
      if (error.message === 'Request timeout') {
        alert('The chess engine is taking too long to respond. The backend server might be having issues. Please try restarting the backend server.');
      } else if (error.message && error.message.includes('Network')) {
        alert('Cannot connect to the chess engine. Please make sure the backend server is running on port 8000.');
      } else {
        alert(`Failed to get computer move: ${error.message || error}`);
      }
    } finally {
      setIsComputerThinking(false);
      computerMoveInProgress.current = false;
    }
  };

  const updateEvaluation = async (fen: string) => {
    try {
      const data = await fetchStockfishScore(fen);
      setEvalScore(data.evaluation);
    } catch (error) {
      console.error("Error getting evaluation:", error);
    }
  };

  const handleGameOver = () => {
    let message = '';
    if (board.isCheckmate()) {
      const winner = board.turn() === 'w' ? 'Black' : 'White';
      message = `Checkmate! ${winner} wins!`;
    } else if (board.isDraw()) {
      if (board.isStalemate()) {
        message = 'Draw by stalemate!';
      } else if (board.isThreefoldRepetition()) {
        message = 'Draw by threefold repetition!';
      } else if (board.isInsufficientMaterial()) {
        message = 'Draw by insufficient material!';
      } else {
        message = 'Draw!';
      }
    }
    
    if (message) {
      // Use a timeout to ensure the board updates before showing the alert
      setTimeout(() => alert(message), 100);
    }
  };

  // Game Control Functions
  const startGame = () => {
    console.log('startGame called', { gameState, playerColor, selectedEngine });
    
    if (gameState === 'setup') {
      console.log('Starting game...');
      setGameState('playing');
      setConversation([]);
      setCommentaryHistory([]);
      // The useEffect will handle making the computer's first move
    }
  };

  const resetGame = () => {
    setGameState('setup');
    setBoard(new Chess());
    setConversation([]);
    setCommentaryHistory([]);
    setIsComputerThinking(false);
    updateEvaluation(new Chess().fen());
  };

  const newGame = () => {
    resetGame();
    // Auto-start if we're already in a game
    if (gameState === 'playing' || gameState === 'ended') {
      setTimeout(startGame, 100);
    }
  };

  // Engine and Settings
  const handleEngineChange = (engine: string) => {
    setSelectedEngine(engine);
    // Auto-set to black for NanoGPT
    if (engine.includes('nanogpt')) {
      setPlayerColor('b');
    }
  };

  const handlePlayerColorChange = (color: 'w' | 'b') => {
    // Don't allow white when using NanoGPT
    if (selectedEngine.includes('nanogpt') && color === 'w') {
      alert('NanoGPT can only play as White. You must play as Black.');
      return;
    }
    setPlayerColor(color);
  };

  // Board Import Functions
  const handleFenInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const fenString = (event.target as HTMLInputElement).value;
      try {
        const newBoard = new Chess(fenString);
        setBoard(newBoard);
        updateEvaluation(fenString);
        setGameState('playing');
      } catch (error) {
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
        setBoard(newBoard);
        updateEvaluation(newBoard.fen());
        setGameState('playing');
      } catch (error) {
        alert('Invalid PGN sequence');
      }
    }
  };

  // Commentary Functions
  const addCommentaryMessage = (engineName: string, currentBoard: Chess, move: ChessMove, commentary: string) => {
    const moveNumber = Math.ceil((currentBoard.history().length) / 2);
    const moveSequence = currentBoard.pgn().split(/\d+\./).pop()?.trim() || '';
    const isWhiteMove = currentBoard.history().length % 2 === 1;
    
    setCommentaryHistory((prevHistory) => [
      ...prevHistory,
      {
        engineName,
        moveNumber: isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`,
        moveSequence: isWhiteMove ? moveSequence.split(' ')[0] : moveSequence.split(' ')[1] || moveSequence,
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

  const toggleContext = () => {
    setContextOn(!contextOn);
  };

  return {
    // Game state
    board,
    gameState,
    selectedEngine,
    playerColor,
    boardOrientation,
    isComputerThinking,
    
    // Game data
    commentaryHistory,
    conversation,
    contextOn,
    evalScore,
    uuid,
    
    // Refs
    commentaryBoxRef: commentaryHistoryRef,
    
    // Actions
    handleMove,
    startGame,
    resetGame,
    resetBoard: resetGame, // Alias for resetGame
    newGame,
    handleEngineChange,
    setSelectedEngine: handleEngineChange, // Alias for handleEngineChange
    handlePlayerColorChange,
    toggleContext,
    handleFenInput,
    handlePgnInput,
    handleRatingSubmit,
  };
}

export default useChess;