import React from 'react'

interface MoveHistoryProps {
  moves: string[]
}

const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
  const formatMoves = (moves: string[]) => {
    const pairs = []
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1
      const whiteMove = moves[i]
      const blackMove = moves[i + 1]
      pairs.push({ moveNumber, whiteMove, blackMove })
    }
    return pairs
  }

  const movePairs = formatMoves(moves)

  return (
    <div className="move-history">
      <h3>Move History</h3>
      
      <div className="moves-container">
        {movePairs.length === 0 ? (
          <p className="no-moves">No moves yet</p>
        ) : (
          <div className="moves-list">
            {movePairs.map(({ moveNumber, whiteMove, blackMove }) => (
              <div key={moveNumber} className="move-pair">
                <span className="move-number">{moveNumber}.</span>
                <span className="white-move">{whiteMove}</span>
                {blackMove && <span className="black-move">{blackMove}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MoveHistory 