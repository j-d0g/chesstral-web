/**
 * ProbeVisualization.tsx - Board State Probe Visualization
 * 
 * PURPOSE: Display heatmaps showing how the model internally represents chess board state
 * FEATURES: Layer selection, piece type selection, real-time heatmap generation using current PGN
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import { apiService } from '../services/apiService'
import './ProbeVisualization.css'

interface HeatmapData {
  heatmap: number[][]
  ground_truth: number[][]
  board_state: number[][]
  piece_type: string
  layer: number
  current_pgn: string
  padded_pgn: string
  move_position: number
  char_index: number
  white_move_indices: number[]
}

interface AnalysisResponse {
  success: boolean
  data: HeatmapData
}

const PIECE_TYPES = [
  { value: 'white_pawns', label: '♟ White Pawns' },
  { value: 'white_knights', label: '♞ White Knights' },
  { value: 'white_bishops', label: '♝ White Bishops' },
  { value: 'white_rooks', label: '♜ White Rooks' },
  { value: 'white_queens', label: '♛ White Queens' },
  { value: 'white_kings', label: '♚ White Kings' },
  { value: 'black_pawns', label: '♙ Black Pawns' },
  { value: 'black_knights', label: '♘ Black Knights' },
  { value: 'black_bishops', label: '♗ Black Bishops' },
  { value: 'black_rooks', label: '♖ Black Rooks' },
  { value: 'black_queens', label: '♕ Black Queens' },
  { value: 'black_kings', label: '♔ Black Kings' },
  { value: 'empty_squares', label: '⬚ Empty Squares' }
]

const LAYERS = Array.from({ length: 8 }, (_, i) => i)

const ProbeVisualization: React.FC = () => {
  const { gameState, fullGamePgn, currentMoveIndex } = useGameStore()
  const [selectedLayer, setSelectedLayer] = useState(5) // Default to layer 5 like notebook
  const [selectedPieceType, setSelectedPieceType] = useState('white_pawns')
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Convert fullGamePgn array to PGN string format
  const buildCurrentPgn = useCallback(() => {
    if (!fullGamePgn || fullGamePgn.length === 0) {
      return ""
    }

    // Get moves up to current position
    const movesToInclude = currentMoveIndex >= 0 ? fullGamePgn.slice(0, currentMoveIndex + 1) : []
    
    if (movesToInclude.length === 0) {
      return ""
    }

    // Format as PGN: "1.e4 e5 2.Nf3 Nc6"
    let pgnString = ""
    for (let i = 0; i < movesToInclude.length; i++) {
      if (i % 2 === 0) {
        // White move
        const moveNumber = Math.floor(i / 2) + 1
        pgnString += `${moveNumber}.${movesToInclude[i]}`
      } else {
        // Black move
        pgnString += ` ${movesToInclude[i]}`
      }
      
      // Add space between move pairs
      if (i % 2 === 1 && i < movesToInclude.length - 1) {
        pgnString += " "
      }
    }

    return pgnString
  }, [fullGamePgn, currentMoveIndex])

  const generateHeatmap = useCallback(async () => {
    const currentPgn = buildCurrentPgn()
    
    // Need at least one move to analyze
    if (!currentPgn.trim()) {
      setHeatmapData(null)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.post('/api/analyze_position', {
        pgn: currentPgn,
        layer: selectedLayer,
        piece_type: selectedPieceType
      }) as AnalysisResponse

      if (response.success && response.data) {
        setHeatmapData(response.data)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate heatmap')
      console.error('Probe visualization error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [buildCurrentPgn, selectedLayer, selectedPieceType])

  // Generate heatmap when position or settings change
  useEffect(() => {
    generateHeatmap()
  }, [generateHeatmap])

  const renderHeatmap = (data: number[][], title: string) => {
    // The data contains probabilities (0-1), so we don't need to normalize
    // Just use the values directly for visualization
    const maxVal = Math.max(...data.flat())
    const minVal = Math.min(...data.flat())

    return (
      <div className="heatmap-container">
        <h4>{title}</h4>
        <div className="heatmap-grid">
          {data.map((row, rowIndex) => (
            <div key={rowIndex} className="heatmap-row">
              {row.map((value, colIndex) => {
                // For probabilities, higher values should be lighter (more confident)
                // Use a grayscale color scheme like the notebook
                const intensity = Math.round(value * 255)
                const backgroundColor = `rgb(${intensity}, ${intensity}, ${intensity})`
                
                // Show the actual probability value as text
                const displayValue = value.toFixed(3)
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="heatmap-cell"
                    style={{
                      backgroundColor,
                      color: intensity > 128 ? 'black' : 'white',
                      fontWeight: 'bold'
                    }}
                    title={`Probability: ${displayValue}`}
                  >
                    {displayValue}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="heatmap-legend">
          <span>Low confidence (0.000)</span>
          <span>High confidence (1.000)</span>
        </div>
      </div>
    )
  }

  const renderGroundTruth = (groundTruthData: number[][]) => {
    return (
      <div className="heatmap-container">
        <h4>Ground Truth (Target Piece)</h4>
        <div className="heatmap-grid">
          {groundTruthData.map((row, rowIndex) => (
            <div key={rowIndex} className="heatmap-row">
              {row.map((value, colIndex) => {
                const backgroundColor = value === 1 ? '#4CAF50' : '#EEEEEE' // Green for piece present, gray for absent
                const textColor = value === 1 ? 'white' : 'black'
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="heatmap-cell"
                    style={{
                      backgroundColor,
                      color: textColor,
                      fontWeight: 'bold'
                    }}
                    title={`Ground truth: ${value === 1 ? 'Present' : 'Absent'}`}
                  >
                    {value === 1 ? '✓' : '·'}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="heatmap-legend">
          <span>✓ Piece Present</span>
          <span>· Piece Absent</span>
        </div>
      </div>
    )
  }

  const renderBoardState = (boardData: number[][]) => {
    const pieceSymbols: { [key: number]: string } = {
      [-6]: '♔', [-5]: '♕', [-4]: '♖', [-3]: '♗', [-2]: '♘', [-1]: '♙',
      0: '·',
      1: '♟', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚'
    }

    return (
      <div className="heatmap-container">
        <h4>Current Board State</h4>
        <div className="heatmap-grid">
          {boardData.slice().reverse().map((row, rowIndex) => (
            <div key={rowIndex} className="heatmap-row">
              {row.map((value, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="heatmap-cell board-cell"
                  style={{
                    backgroundColor: (rowIndex + colIndex) % 2 === 0 ? '#f0d9b5' : '#b58863'
                  }}
                >
                  {pieceSymbols[value] || '·'}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderConfidenceOverlay = (heatmapData: number[][], groundTruth: number[][]) => {
    return (
      <div className="heatmap-container">
        <h4>Confidence vs Ground Truth</h4>
        <div className="heatmap-grid">
          {heatmapData.map((row, rowIndex) => (
            <div key={rowIndex} className="heatmap-row">
              {row.map((confidence, colIndex) => {
                const isGroundTruth = groundTruth[rowIndex][colIndex] === 1
                const highConfidence = confidence > 0.5
                
                let backgroundColor = '#EEEEEE'
                let status = ''
                
                if (isGroundTruth && highConfidence) {
                  backgroundColor = '#4CAF50' // Green: Correct + High Confidence
                  status = '✓✓'
                } else if (isGroundTruth && !highConfidence) {
                  backgroundColor = '#FF5722' // Red: Correct + Low Confidence  
                  status = '✓✗'
                } else if (!isGroundTruth && highConfidence) {
                  backgroundColor = '#FF9800' // Orange: Incorrect + High Confidence
                  status = '✗✓'
                } else {
                  backgroundColor = '#E0E0E0' // Gray: Correct + Low Confidence
                  status = '✗✗'
                }
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="heatmap-cell"
                    style={{
                      backgroundColor,
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '10px'
                    }}
                    title={`Confidence: ${confidence.toFixed(3)}, Ground Truth: ${isGroundTruth ? 'Yes' : 'No'}`}
                  >
                    <div>{status}</div>
                    <div style={{ fontSize: '8px' }}>{confidence.toFixed(2)}</div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="confidence-legend">
          <span style={{ color: '#4CAF50' }}>🟢 Correct + High Confidence</span>
          <span style={{ color: '#FF5722' }}>🔴 Correct + Low Confidence</span>
          <span style={{ color: '#FF9800' }}>🟠 Incorrect + High Confidence</span>
          <span style={{ color: '#E0E0E0' }}>⚪ Incorrect + Low Confidence</span>
        </div>
      </div>
    )
  }

  const currentPgn = buildCurrentPgn()

  return (
    <div className="probe-visualization">
      <div className="probe-controls">
        <div className="control-group">
          <label htmlFor="layer-select">Layer:</label>
          <select
            id="layer-select"
            value={selectedLayer}
            onChange={(e) => setSelectedLayer(Number(e.target.value))}
            disabled={isLoading}
          >
            {LAYERS.map(layer => (
              <option key={layer} value={layer}>
                Layer {layer}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="piece-select">Piece Type:</label>
          <select
            id="piece-select"
            value={selectedPieceType}
            onChange={(e) => setSelectedPieceType(e.target.value)}
            disabled={isLoading}
          >
            {PIECE_TYPES.map(piece => (
              <option key={piece.value} value={piece.value}>
                {piece.label}
              </option>
            ))}
          </select>
        </div>

        <button
          className="refresh-btn"
          onClick={generateHeatmap}
          disabled={isLoading || !currentPgn.trim()}
        >
          {isLoading ? '🔄 Analyzing...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {isLoading && (
        <div className="loading-message">
          🔬 Analyzing current position with model probes...
        </div>
      )}

      {!currentPgn.trim() && !isLoading && (
        <div className="no-data-message">
          <p>🎯 Make some moves to see probe analysis</p>
          <p>The AI needs at least one move to analyze the position</p>
        </div>
      )}

      {heatmapData && !isLoading && (
        <div className="visualization-content">
          <div className="heatmap-comparison">
            <div className="heatmap-section">
              {renderHeatmap(heatmapData.heatmap, `Model Predictions (Layer ${selectedLayer})`)}
            </div>
            <div className="heatmap-section">
              {renderGroundTruth(heatmapData.ground_truth)}
            </div>
          </div>
          
          <div className="heatmap-comparison">
            <div className="heatmap-section">
              {renderBoardState(heatmapData.board_state)}
            </div>
            <div className="heatmap-section">
              {renderConfidenceOverlay(heatmapData.heatmap, heatmapData.ground_truth)}
            </div>
          </div>

          <div className="probe-info">
            <h4>Analysis Information</h4>
            <div className="info-grid">
              <div className="info-item">
                <strong>Layer:</strong> {heatmapData.layer}
              </div>
              <div className="info-item">
                <strong>Piece Type:</strong> {PIECE_TYPES.find(p => p.value === heatmapData.piece_type)?.label}
              </div>
              <div className="info-item">
                <strong>Current PGN:</strong> {heatmapData.current_pgn || 'Starting position'}
              </div>
              <div className="info-item">
                <strong>Move Position:</strong> {heatmapData.move_position + 1} (of {heatmapData.white_move_indices.length} white moves)
              </div>
              <div className="info-item">
                <strong>Character Index:</strong> {heatmapData.char_index}
              </div>
              <div className="info-item">
                <strong>White Move Indices:</strong> [{heatmapData.white_move_indices.join(', ')}]
              </div>
            </div>
          </div>
        </div>
      )}

      {!heatmapData && !isLoading && !error && currentPgn.trim() && (
        <div className="no-data-message">
          <p>🔬 Select a layer and piece type to visualize the model's internal board representation</p>
          <p>This shows how the AI "thinks" about where pieces are located on the board</p>
        </div>
      )}
    </div>
  )
}

export default ProbeVisualization 