# ChessGPT Frontend

This directory contains the React-based frontend for the ChessGPT application, built with Vite and TypeScript.

## Key Features

-   **Interactive Chessboard:** Built with `react-chessboard`.
-   **Real-time Engine Communication:** Communicates with the backend API to get moves from different chess engines (NanoGPT, Stockfish, etc.).
-   **Dynamic UI:** Includes components for move history, game controls, engine selection, and detailed AI analysis.

## State Management with Zustand

The application's state is managed by **Zustand**, a small, fast, and scalable state-management solution.

### Core Store: `useGameStore`

The central state is located in `src/store/gameStore.ts`. This store manages:

-   The `chess.js` game instance.
-   The current board state (FEN, PGN history).
-   The selected AI engine and its parameters (e.g., temperature).
-   The player's side (`white` or `black`).
-   UI state, such as whether the AI is currently "thinking".

### Critical Bug Fix: Immutable Game State

A critical, intermittent bug was identified and fixed related to how the `chess.js` game instance was managed.

-   **The Problem:** The `chess.js` instance was being copied incorrectly within the state actions (`makeHumanMove`, `getAIMove`). The "copy" was created using `new Chess(game.fen())`, which only preserves the board position and **discards the entire move history (PGN)**. This caused the AI to receive an incomplete history, leading to illegal moves.

-   **The Solution:** The game instance is now correctly copied by using its PGN representation. A true, history-preserving copy is created like this:
    ```typescript
    const newGame = new Chess()
    const pgn = game.pgn()
    if (pgn) {
      newGame.loadPgn(pgn)
    }
    ```
    This ensures that the full game state, including all move history, is maintained immutably across every turn.

## Available Scripts

In the project directory, you can run:

### `npm install`

Installs the necessary dependencies.

### `npm run dev`

Runs the app in development mode. Open [http://localhost:5173](http://localhost:5173) to view it in the browser. The page will reload if you make edits.
