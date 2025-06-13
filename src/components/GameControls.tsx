import React from 'react'

interface GameControlsProps {
  onNewGame: () => void
  onFlipBoard: () => void
  isThinking: boolean
  showResign?: boolean
  onResign?: () => void
}

const GameControls: React.FC<GameControlsProps> = ({
  onNewGame,
  onFlipBoard,
  isThinking,
  showResign = false,
  onResign,
}) => {
  return (
    <div className="game-controls">
      <h3>Game Controls</h3>
      
      <div className="control-buttons">
        <button 
          onClick={onNewGame}
          disabled={isThinking}
          className="control-button new-game"
        >
          🔄 New Game
        </button>
        
        <button 
          onClick={onFlipBoard}
          disabled={isThinking}
          className="control-button flip-board"
        >
          🔄 Flip Board
        </button>

        {showResign && onResign && (
          <button 
            onClick={onResign}
            disabled={isThinking}
            className="control-button resign"
          >
            🏳️ Resign
          </button>
        )}
      </div>
    </div>
  )
}

export default GameControls 