// apiService.ts
import { Chess } from 'chess.js';
import {RatingJSON} from "../types/RatingJSON";

export interface StandardizedMoveResponse {
  success: boolean;
  move: string;
  move_san: string;
  move_uci: string;
  thoughts: string;
  confidence: number;
  engine: string;
  timestamp: string;
  uuid: string;
  board_fen: string;
  error: string | null;
  raw_response?: any;
}

// Legacy interface for backward compatibility
interface LegacyMoveResponse {
  uuid: string;
  prompt: {
    completion: {
      move: string;
      thoughts: string;
    };
    context: [];
  };
}

type MoveResponse = StandardizedMoveResponse | LegacyMoveResponse;

export const fetchComputerMove = async (
    currentBoard: Chess,
    selectedEngine: string,
    contextOn: boolean,
    conversation: []
): Promise<StandardizedMoveResponse | null> => {
  const context = contextOn ? conversation : [];
  const pgnMoves = currentBoard.history();
  
  const requestBody = {
    fen: currentBoard.fen(),
    engine: selectedEngine,
    pgn: pgnMoves,
    context: context,
  };
  
  console.log('Sending move request:', requestBody);
  
  try {
    const response = await fetch('http://127.0.0.1:8000/api/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Move response received:', data);
      
      // Handle both new standardized format and legacy format
      if (isStandardizedResponse(data)) {
        // Check for API-level errors
        if (!data.success && data.error) {
          console.error('API returned error:', data.error);
          throw new Error(`Move generation failed: ${data.error}`);
        }
        return data;
      } else {
        // Convert legacy format to standardized format
        return convertLegacyResponse(data, selectedEngine, currentBoard.fen());
      }
    } else {
      const errorText = await response.text();
      console.error("Failed to fetch move from server:", response.status, errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error("Network error fetching move:", error);
    throw error;
  }
};

// Type guard to check if response is in new standardized format
function isStandardizedResponse(data: any): data is StandardizedMoveResponse {
  return data && 
         typeof data.success === 'boolean' &&
         typeof data.move === 'string' &&
         typeof data.confidence === 'number' &&
         typeof data.engine === 'string';
}

// Convert legacy response format to standardized format
function convertLegacyResponse(
  data: LegacyMoveResponse, 
  engine: string, 
  fen: string
): StandardizedMoveResponse {
  const move = data.prompt?.completion?.move || '';
  const thoughts = data.prompt?.completion?.thoughts || '';
  
  return {
    success: !!move,
    move: move,
    move_san: move, // Assume it's already in SAN format
    move_uci: move, // Frontend can convert if needed
    thoughts: thoughts,
    confidence: 0.8, // Default confidence for legacy responses
    engine: engine,
    timestamp: new Date().toISOString(),
    uuid: data.uuid || generateUUID(),
    board_fen: fen,
    error: move ? null : 'No move returned from engine'
  };
}

// Simple UUID generator for legacy responses
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const fetchStockfishScore = async (fen: string): Promise<any> => {
    const response = await fetch('http://127.0.0.1:8000/api/eval', {
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
    const response = await fetch('http://127.0.0.1:8000/api/rate_move', {
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