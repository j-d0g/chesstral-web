import React, { useState } from 'react'
import { Chess } from 'chess.js'

interface PositionInputProps {
  onLoadPosition: (fen: string) => boolean | void
  onLoadPgn: (pgnText: string) => boolean | void
  disabled?: boolean
}

const PositionInput: React.FC<PositionInputProps> = ({
  onLoadPosition,
  onLoadPgn,
  disabled = false,
}) => {
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
        if (onLoadPgn(trimmedInput) === false) {
          throw new Error('Unable to load this position')
        }
      } else {
        const fen = validateFen(trimmedInput);
        if (onLoadPosition(fen) === false) throw new Error('Unable to load this position')
      }

      setPositionInput('')
      setIsExpanded(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid position format')
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
    onLoadPosition(new Chess().fen())
    setError(null)
  }

  const loadPresetPosition = (name: string, pgn: string) => {
    try {
      if (onLoadPgn(pgn) === false) {
        throw new Error('Unable to load this position')
      }
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
          disabled={disabled}
        >
          ♛ Starting Position
        </button>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="control-button"
          disabled={disabled}
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
                disabled={disabled}
              />
              PGN Moves (Recommended)
            </label>
            <label>
            <input
                type="radio"
                value="fen"
                checked={inputType === 'fen'}
                onChange={(e) => setInputType(e.target.value as 'pgn' | 'fen')}
                disabled={disabled}
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
              disabled={disabled}
            />
            <button 
              onClick={handleLoadPosition}
              disabled={disabled || !positionInput.trim()}
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
                disabled={disabled}
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