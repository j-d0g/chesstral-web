import React, { CSSProperties, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../store/gameStore'

interface EngineConfig {
  type: string
  model?: string
}

interface EngineSelectorProps {
  selectedEngine: EngineConfig
  onEngineChange: (engine: EngineConfig) => void
  disabled?: boolean
}

const menuWidth = 240

const getMenuPosition = (element: HTMLButtonElement): CSSProperties => {
  const rect = element.getBoundingClientRect()
  const height = Math.min(300, window.innerHeight - 16)
  const width = Math.min(
    Math.max(rect.width, menuWidth),
    Math.max(0, window.innerWidth - 16),
  )
  const left = Math.min(
    Math.max(8, rect.left),
    Math.max(8, window.innerWidth - width - 8),
  )
  const top =
    rect.bottom + height + 4 <= window.innerHeight
      ? rect.bottom + 4
      : Math.max(8, rect.top - height - 4)

  return { position: 'fixed', top, left, width, maxHeight: height, zIndex: 1_000_000 }
}

const EngineSelector: React.FC<EngineSelectorProps> = ({
  selectedEngine,
  onEngineChange,
  disabled = false,
}) => {
  const { engines, enginesLoading } = useGameStore()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [engineMenuPosition, setEngineMenuPosition] = useState<CSSProperties>()
  const [modelMenuPosition, setModelMenuPosition] = useState<CSSProperties>()
  const containerRef = useRef<HTMLDivElement>(null)
  const engineMenuRef = useRef<HTMLDivElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeMenus = () => {
      setShowDropdown(false)
      setShowModelSelector(false)
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        !containerRef.current?.contains(target) &&
        !engineMenuRef.current?.contains(target) &&
        !modelMenuRef.current?.contains(target)
      ) {
        closeMenus()
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenus()
    }
    const handleScroll = (event: Event) => {
      const target = event.target
      if (
        target instanceof Node &&
        (engineMenuRef.current?.contains(target) || modelMenuRef.current?.contains(target))
      ) {
        return
      }
      closeMenus()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', closeMenus)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', closeMenus)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  const currentEngine = engines.find((engine) => engine.name === selectedEngine.type)
  const hasMultipleModels = (currentEngine?.models.length ?? 0) > 1

  const handleEngineSelect = (engineName: string, models: string[]) => {
    if (disabled) return
    onEngineChange({ type: engineName, model: models[0] })
    setShowDropdown(false)
  }

  const handleModelSelect = (model: string) => {
    if (disabled) return
    onEngineChange({ type: selectedEngine.type, model })
    setShowModelSelector(false)
  }

  return (
    <div className={`engine-selector-compact ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      <div className="engine-dropdown">
        <button
          className="engine-button"
          onClick={(event) => {
            if (disabled || enginesLoading) return
            if (showDropdown) {
              setShowDropdown(false)
            } else {
              setEngineMenuPosition(getMenuPosition(event.currentTarget))
              setShowDropdown(true)
              setShowModelSelector(false)
            }
          }}
          disabled={disabled || enginesLoading}
          aria-expanded={showDropdown}
        >
          {currentEngine?.name || 'Select Engine'}
          <span className="dropdown-arrow">▼</span>
        </button>
      </div>

      {showDropdown &&
        engineMenuPosition &&
        createPortal(
          <div
            className="engine-dropdown-menu"
            ref={engineMenuRef}
            style={engineMenuPosition}
            role="listbox"
          >
            {engines.map((engine) => {
              const available = engine.status === 'available'
              return (
                <button
                  key={engine.name}
                  className={`engine-option ${selectedEngine.type === engine.name ? 'selected' : ''}`}
                  onClick={() => handleEngineSelect(engine.name, engine.models)}
                  disabled={!available || disabled}
                  title={available ? undefined : engine.reason ?? 'Unavailable'}
                >
                  <span>{engine.name}</span>
                  {!available && <small className="engine-option-reason">{engine.reason}</small>}
                </button>
              )
            })}
          </div>,
          document.body,
        )}

      {hasMultipleModels && (
        <div className="model-dropdown">
          <button
            className="model-button"
            onClick={(event) => {
              if (disabled) return
              if (showModelSelector) {
                setShowModelSelector(false)
              } else {
                setModelMenuPosition(getMenuPosition(event.currentTarget))
                setShowModelSelector(true)
                setShowDropdown(false)
              }
            }}
            disabled={disabled}
            aria-expanded={showModelSelector}
          >
            {selectedEngine.model || currentEngine?.models[0]}
            <span className="dropdown-arrow">▼</span>
          </button>
          {showModelSelector &&
            modelMenuPosition &&
            createPortal(
              <div
                className="model-dropdown-menu"
                ref={modelMenuRef}
                style={modelMenuPosition}
                role="listbox"
              >
                {currentEngine?.models.map((model) => (
                  <button
                    key={model}
                    className={`model-option ${selectedEngine.model === model ? 'selected' : ''}`}
                    onClick={() => handleModelSelect(model)}
                  >
                    {model}
                  </button>
                ))}
              </div>,
              document.body,
            )}
        </div>
      )}
    </div>
  )
}

export default EngineSelector
