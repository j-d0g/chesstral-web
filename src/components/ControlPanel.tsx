// ControlPanel.tsx
import React from 'react';
import '../styles/ControlPanel.css';

type ControlPanelProps = {
  selectedEngine: string;
  setSelectedEngine: (engine: string) => void;
  contextOn: boolean;
  toggleContext: () => void;
  resetBoard: () => void;
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedEngine,
  setSelectedEngine,
  contextOn,
  toggleContext,
  resetBoard,
}) => {
  const handleEngineChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newEngine = event.target.value;
    setSelectedEngine(newEngine);
  };

  return (
    <div className="control-panel">
      <div className="engine-selector">
        <label htmlFor="engine-select">Select Engine: </label>
          <select id="engine-select" value={selectedEngine} onChange={handleEngineChange}>
              <option value="You">You</option>
              <option value="stockfish">Stockfish</option>
              <option value="open-mistral-7b">Open-Mistral-7B</option>
              <option value="open-mixtral-8x7b">Open-Mixtral-8x7B</option>
              <option value="open-mixtral-8x22b">Open-Mixtral-8x22B</option>
              <option value="mistral-small-latest">Mistral-Small-Latest</option>
              <option value="mistral-medium-latest">Mistral-Medium-Latest</option>
              <option value="mistral-large-latest">Mistral-Large-Latest</option>
              <option value="gpt-3.5-turbo-0125">GPT-3.5-Turbo</option>
              <option value="gpt-4-turbo">GPT-4-Turbo</option>
          </select>
      </div>
        <div className="board-buttons">
            <button onClick={resetBoard}>Reset Board</button>
            <button onClick={toggleContext} className={`context-button ${contextOn ? 'on' : ''}`}>
                {contextOn ? 'Context On' : 'Context Off'}
            </button>
        </div>
    </div>
  );
};

export default ControlPanel;