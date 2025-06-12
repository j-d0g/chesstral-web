import React from 'react'
import ChessGame from './components/ChessGame'
import './App.css'

function App() {
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