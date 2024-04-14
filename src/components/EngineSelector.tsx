import React from 'react';

interface EngineSelectorProps {
  selectedEngine: string;
  onEngineChange: (engine: string) => void;
}

const EngineSelector: React.FC<EngineSelectorProps> = ({ selectedEngine, onEngineChange }) => {
  const handleEngineChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newEngine = event.target.value;
    onEngineChange(newEngine);
  };

  return (
    <div>
      <label htmlFor="engine-select">Select Engine:</label>
      <select id="engine-select" value={selectedEngine} onChange={handleEngineChange}>
        <option value="stockfish">Stockfish</option>
        <option value="mistral-7b">Mistral-7B</option>
        <option value="mixtral-8x7b">Mixtral-8x7B</option>
      </select>
    </div>
  );
};

export default EngineSelector;