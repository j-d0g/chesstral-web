import React from 'react'
import { Chess } from 'chess.js'

interface MoveHistoryProps {
  moves: string[]
  startFen: string
  currentMoveIndex: number
  onMoveClick: (index: number) => void
}

const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  startFen,
  currentMoveIndex,
  onMoveClick,
}) => {
  const position = new Chess(startFen)
  const entries = moves.map((move, index) => {
    const moveNumber = position.fen().split(' ')[5] ?? '1'
    const turn = position.turn()
    const moveLabel = `${moveNumber}${turn === 'w' ? '.' : '...'}`
    position.move(move)
    return { move, moveLabel, turn, index }
  })

  return (
    <div className="move-history">
      <h3>Move History</h3>

      <div className="moves-container">
        {entries.length === 0 ? (
          <p className="no-moves">No moves yet</p>
        ) : (
          <div className="moves-list">
            {entries.map(({ move, moveLabel, turn, index }) => (
              <div key={index} className="move-pair">
                <span className="move-number">{moveLabel}</span>
                <button
                  type="button"
                  className={`${turn === 'w' ? 'white-move' : 'black-move'} ${currentMoveIndex === index ? 'current' : ''}`}
                  onClick={() => onMoveClick(index)}
                >
                  {move}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MoveHistory 