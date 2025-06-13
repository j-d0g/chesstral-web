import React, { useState, useEffect, useRef } from 'react';

interface EngineConfig {
  type: string;
  model?: string;
}

interface EngineSelectorProps {
  selectedEngine: EngineConfig;
  onEngineChange: (engine: EngineConfig) => void;
  disabled?: boolean;
}

const EngineSelector: React.FC<EngineSelectorProps> = ({
  selectedEngine,
  onEngineChange,
  disabled = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowModelSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const engines = [
    { 
      type: 'nanogpt', 
      name: '🧠 NanoGPT', 
      models: ['small-8', 'small-16', 'small-24', 'small-36', 'medium-12', 'medium-16', 'large-16'],
      enabled: true
    },
    { 
      type: 'stockfish', 
      name: '🐟 Stockfish', 
      models: ['default'],
      enabled: true
    },
          { 
        type: 'openai', 
        name: '🤖 OpenAI', 
        models: ['o1', 'o1-mini', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
        enabled: true
      },
    { 
      type: 'anthropic', 
      name: '🎭 Claude', 
      models: ['claude-4-sonnet-20250514', 'claude-3-7-sonnet-20250219', 'claude-opus-4-20250514', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
      enabled: true
    },
    { 
      type: 'gemini', 
      name: '💎 Gemini', 
      models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash-preview-05-20', 'gemini-2.5-pro-preview-06-05'],
      enabled: true
    },
          { 
        type: 'deepseek', 
        name: '🔍 DeepSeek', 
        models: ['deepseek-r1', 'deepseek-r1-distill-llama-70b', 'deepseek-chat', 'deepseek-coder'],
        enabled: true
      },
  ];

  const currentEngine = engines.find(e => e.type === selectedEngine.type);
  const hasMultipleModels = currentEngine && currentEngine.models.length > 1;

  console.log('EngineSelector Debug:', {
    selectedEngineType: selectedEngine.type,
    selectedEngineModel: selectedEngine.model,
    currentEngine: currentEngine,
    hasMultipleModels: hasMultipleModels,
    showModelSelector: showModelSelector
  });

  const handleEngineSelect = (engine: any) => {
    if (disabled) return;
    onEngineChange({
      type: engine.type,
      model: engine.models[0]
    });
    setShowDropdown(false);
  };

  const handleModelSelect = (model: string) => {
    if (disabled) return;
    console.log('Model selected:', model);
    console.log('Current selectedEngine:', selectedEngine);
    console.log('Current engine:', currentEngine);
    onEngineChange({
      type: selectedEngine.type,
      model: model
    });
    setShowModelSelector(false);
  };

  return (
    <div className={`engine-selector-compact ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      {/* Engine Dropdown */}
      <div className="engine-dropdown">
        <button 
          className="engine-button"
          onClick={() => {
            if (disabled) return;
            setShowDropdown(!showDropdown);
            setShowModelSelector(false);
          }}
          disabled={disabled}
        >
          {currentEngine?.name || 'Select Engine'}
          <span className="dropdown-arrow">▼</span>
        </button>
        
        {showDropdown && !disabled && (
          <div className="engine-dropdown-menu">
            {engines.filter(e => e.enabled).map((engine) => (
              <button
                key={engine.type}
                className={`engine-option ${selectedEngine.type === engine.type ? 'selected' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEngineSelect(engine);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {engine.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model Selector */}
      {hasMultipleModels && (
        <div className="model-dropdown">
          <button 
            className="model-button"
            onClick={() => {
              if (disabled) return;
              setShowModelSelector(!showModelSelector);
              setShowDropdown(false);
            }}
            disabled={disabled}
          >
            {selectedEngine.model || currentEngine.models[0]}
            <span className="dropdown-arrow">▼</span>
          </button>
          
          {showModelSelector && !disabled && (
            <div className="model-dropdown-menu">
              {currentEngine.models.map((model) => (
                <button
                  key={model}
                  className={`model-option ${selectedEngine.model === model ? 'selected' : ''}`}
                  onClick={(e) => {
                    console.log('Model option clicked:', model);
                    e.preventDefault();
                    e.stopPropagation();
                    handleModelSelect(model);
                  }}
                  onMouseDown={(e) => {
                    console.log('Model option mousedown:', model);
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    console.log('Model option mouseup:', model);
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {model}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EngineSelector;