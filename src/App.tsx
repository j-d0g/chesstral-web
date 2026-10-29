import React, { useEffect, useRef } from 'react'
import ChessGame from './components/ChessGame'
import { openingBook } from './services/openingBook'
import { useGameStore } from './store/gameStore'
import './App.css'

function App() {
  const loadEngines = useGameStore((state) => state.loadEngines)
  const didLoadResources = useRef(false)

  useEffect(() => {
    if (didLoadResources.current) return
    didLoadResources.current = true
    void openingBook.loadOpenings()
    void loadEngines()
  }, [loadEngines])

  return (
    <div className="App">
      <main>
        <ChessGame />
      </main>
    </div>
  )
}

export default App 