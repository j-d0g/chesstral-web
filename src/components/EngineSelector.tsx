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
      <label htmlFor="engine-select">Select Engine: </label>
      <select id="engine-select" value={selectedEngine} onChange={handleEngineChange}>
        <option value="open-mistral-7b">Open-Mistral-7B</option>
        <option value="open-mixtral-8x7b">Open-Mixtral-8x7B</option>
        <option value="open-mixtral-8x22b">Open-Mixtral-8x22B</option>
        <option value="mistral-small-latest">Mistral-Small-Latest</option>
        <option value="mistral-medium-latest">Mistral-Medium-Latest</option>
        <option value="mistral-large-latest">Mistral-Large-Latest</option>
        <option value="gpt-3.5-turbo-0125">GPT-3.5-Turbo</option>
        <option value="gpt-4-turbo">GPT-4-Turbo</option>
        <option value="claude-3-haiku-20240307">Claude-3-Haiku</option>
        <option value="claude-3-sonnet-20240229">Claude-3-Sonnet</option>
        <option value="claude-3-opus-20240229">Claude-3-Opus</option>
        <option value="meta/meta-llama-3-8b-instruct">Llama-3-8B</option>
        <option value="meta/meta-llama-3-70b-instruct">Llama-3-70B</option>
        <option value="stockfish">Stockfish</option>
      </select>
    </div>
  );
};

export default EngineSelector;