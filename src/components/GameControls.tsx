import React from 'react'

interface GameControlsProps {
  onNewGame: () => void
  onFlipBoard: () => void
  isThinking: boolean
}

const GameControls: React.FC<GameControlsProps> = ({
  onNewGame,
  onFlipBoard,
  isThinking,
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
      </div>
    </div>
  )
}

export default GameControls 