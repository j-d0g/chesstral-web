import React, { useEffect } from 'react'
import ChessGame from './components/ChessGame'
import { openingBook } from './services/openingBook'
import './App.css'

function App() {
  useEffect(() => {
    // Load opening book on app startup
    openingBook.loadOpenings()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>ChessGPT Web v2</h1>
        <p>Play chess against AI engines</p>
      </header>
      <main>
        <ChessGame />
      </main>
    </div>
  )
}

export default App 