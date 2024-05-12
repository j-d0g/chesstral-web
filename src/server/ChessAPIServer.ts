// apiService.ts
import { Chess } from 'chess.js';
import {RatingJSON} from "../types/RatingJSON";

interface MoveResponse {
  uuid: string;
  prompt: {
    completion: {
      move: string;
      thoughts: string;
    };
    context: [];
  };
}

export const fetchComputerMove = async (
    currentBoard: Chess,
    selectedEngine: string,
    contextOn: boolean,
    conversation: []
): Promise<MoveResponse | null> => {
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
    return await response.json();
  } else {
    console.error("Failed to fetch move from server");
    return null;
  }
};

export const fetchStockfishScore = async (fen: string): Promise<any> => {
    const response = await fetch('http://127.0.0.1:5000/api/eval', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fen: fen }),
    });

    if (response.ok) {
        return await response.json();
    } else {
      alert("Failed to fetch stockfish evaluation from server");
      return 0;
    }
}

export const saveRating = async (rating: RatingJSON): Promise<void> => {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/rate_move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rating),
    });

    if (!response.ok) {
      console.error('Failed to submit rating to server');
    }
  } catch (error) {
    alert('Error while submitting your rating. Please try again.');
  }
};