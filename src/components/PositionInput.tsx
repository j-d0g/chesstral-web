import React, { useState } from 'react'
import { Chess } from 'chess.js'

interface PositionInputProps {
  onLoadPosition: (fen: string, pgn?: string[]) => void
}

const PositionInput: React.FC<PositionInputProps> = ({ onLoadPosition }) => {
  const [positionInput, setPositionInput] = useState('')
  const [inputType, setInputType] = useState<'pgn' | 'fen'>('pgn') // PGN is now default
  const [isExpanded, setIsExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLoadPosition = () => {
    const trimmedInput = positionInput.trim();
    if (!trimmedInput) {
      setError('Please enter a position');
      return;
    }

    try {
      if (inputType === 'pgn') {
        const { fen, pgn } = parsePgnMoves(trimmedInput);
        onLoadPosition(fen, pgn);
      } else {
        const fen = validateFen(trimmedInput);
        onLoadPosition(fen);
      }

      setPositionInput('')
      setIsExpanded(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid position format')
    }
  }

  const parsePgnMoves = (pgnInput: string): { fen: string, pgn: string[] } => {
    try {
      const game = new Chess()
      
      // Clean up the PGN input - remove move numbers and extra whitespace
      let cleanPgn = pgnInput
        .replace(/\d+\./g, '') // Remove move numbers like "1.", "2.", etc.
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .trim()
      
      // If it's empty after cleaning, return starting position
      if (!cleanPgn) {
        return {
          fen: game.fen(),
          pgn: []
        }
      }
      
      // Split into individual moves
      const moves = cleanPgn.split(/\s+/).filter(move => move.length > 0)
      
      // Apply each move
      for (const move of moves) {
        try {
          const result = game.move(move)
          if (!result) {
            throw new Error(`Invalid move: "${move}"`)
          }
        } catch (moveError) {
          throw new Error(`Invalid move "${move}": ${moveError instanceof Error ? moveError.message : 'Unknown error'}`)
        }
      }
      
      return {
        fen: game.fen(),
        pgn: game.history()
      }
    } catch (err) {
      throw new Error(`PGN parsing error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const validateFen = (fen: string): string => {
    try {
      // Test if FEN is valid by creating a Chess instance
      new Chess(fen)
      return fen
    } catch (err) {
      throw new Error('Invalid FEN notation')
    }
  }

  const handleLoadStartingPosition = () => {
    onLoadPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [])
    setError(null)
  }

  const loadPresetPosition = (name: string, pgn: string) => {
    try {
      const { fen, pgn: pgnMoves } = parsePgnMoves(pgn)
      onLoadPosition(fen, pgnMoves)
      setError(null)
    } catch (err) {
      setError(`Error loading ${name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Updated presets with PGN notation (more natural for language models)
  const presetPositions = [
    { name: 'Starting Position', pgn: '' },
    { name: 'Sicilian Defense', pgn: '1. e4 c5' },
    { name: 'Queen\'s Gambit', pgn: '1. d4 d5 2. c4' },
    { name: 'King\'s Indian Defense', pgn: '1. d4 Nf6 2. c4 g6' },
    { name: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4' },
    { name: 'French Defense', pgn: '1. e4 e6' },
    { name: 'Caro-Kann Defense', pgn: '1. e4 c6' },
    { name: 'Ruy Lopez', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5' },
    { name: 'Scholar\'s Mate Setup', pgn: '1. e4 e5 2. Bc4 Nc6 3. Qh5' },
    { name: 'King\'s Gambit', pgn: '1. e4 e5 2. f4' }
  ]

  return (
    <div className="position-input">
      <h3>Load Position</h3>
      
      <div className="position-controls">
        <button 
          onClick={handleLoadStartingPosition}
          className="control-button"
        >
          ♛ Starting Position
        </button>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="control-button"
        >
          {isExpanded ? '▼' : '▶'} Custom Position
        </button>
      </div>

      {isExpanded && (
        <div className="position-expanded">
          <div className="input-type-selector">
            <label>
              <input
                type="radio"
                value="pgn"
                checked={inputType === 'pgn'}
                onChange={(e) => setInputType(e.target.value as 'pgn' | 'fen')}
              />
              PGN Moves (Recommended)
            </label>
            <label>
            <input
                type="radio"
                value="fen"
                checked={inputType === 'fen'}
                onChange={(e) => setInputType(e.target.value as 'pgn' | 'fen')}
              />
              FEN Notation
            </label>
          </div>

          <div className="position-input-field">
            <textarea
              value={positionInput}
              onChange={(e) => {
                setPositionInput(e.target.value)
                setError(null)
              }}
              placeholder={
                inputType === 'pgn' 
                  ? 'Enter PGN moves (e.g., 1. e4 e5 2. Nf3 Nc6 3. Bb5) - Preferred for AI engines'
                  : 'Enter FEN notation (e.g., rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1)'
              }
              className={`position-field ${error ? 'error' : ''}`}
              rows={3}
            />
            <button 
              onClick={handleLoadPosition}
              disabled={!positionInput.trim()}
              className="load-button"
            >
              Load {inputType.toUpperCase()}
            </button>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="format-help">
            <h4>Format Help:</h4>
            <p>
              <strong>PGN:</strong> Game moves from starting position (recommended for AI engines)<br/>
              <strong>FEN:</strong> Complete position notation (for specific positions)
            </p>
            <p className="ai-note">
              💡 <strong>Note:</strong> Language models work best with PGN notation as they're trained on game moves.
            </p>
          </div>

          <div className="preset-positions">
            <h4>Common Openings (PGN):</h4>
            <div className="preset-grid">
            {presetPositions.map((position) => (
              <button
                key={position.name}
                  onClick={() => loadPresetPosition(position.name, position.pgn)}
                className="preset-button"
              >
                {position.name}
              </button>
            ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PositionInput 