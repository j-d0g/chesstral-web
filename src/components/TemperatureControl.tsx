import React from 'react'
import { useGameStore } from '../store/gameStore'

const TemperatureControl: React.FC = () => {
  const { temperature, setTemperature } = useGameStore()

  // Define temperature presets
  const presets = [
    { value: 0.01, label: 'Precise', description: 'Almost deterministic, best moves' },
    { value: 0.3, label: 'Balanced', description: 'Some variation, good moves' },
    { value: 0.7, label: 'Creative', description: 'More experimental, varied play' },
    { value: 1.0, label: 'Wild', description: 'Very random, unpredictable' },
  ]

  const currentPreset = presets.find(p => Math.abs(p.value - temperature) < 0.05)

  return (
    <div className="temperature-control">
      <h3>AI Temperature</h3>
      
      <div className="temperature-display">
        <span className="temp-value">{temperature.toFixed(2)}</span>
        {currentPreset && <span className="temp-label">{currentPreset.label}</span>}
      </div>

      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={temperature}
        onChange={(e) => setTemperature(parseFloat(e.target.value))}
        className="temperature-slider"
      />

      <div className="temperature-presets">
        {presets.map((preset) => (
          <button
            key={preset.value}
            className={`preset-btn ${Math.abs(temperature - preset.value) < 0.05 ? 'active' : ''}`}
            onClick={() => setTemperature(preset.value)}
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="temperature-info">
        <p>
          {temperature <= 0.1 && "🎯 Very precise - AI will play the most likely moves"}
          {temperature > 0.1 && temperature <= 0.4 && "⚖️ Balanced - AI will play strong but varied moves"}
          {temperature > 0.4 && temperature <= 0.7 && "🎨 Creative - AI will try more experimental moves"}
          {temperature > 0.7 && "🎲 Wild - AI will play very unpredictably"}
        </p>
        <small>
          💡 Lower values = stronger play. Higher values = more variety.
        </small>
      </div>
    </div>
  )
}

export default TemperatureControl 