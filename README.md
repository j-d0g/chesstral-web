# ChessGPT Frontend

This directory contains the React-based frontend for the ChessGPT application, built with Vite and TypeScript.

## Key Features

-   **Interactive Chessboard:** Built with `react-chessboard`.
-   **Real-time Engine Communication:** Communicates with the backend API to get moves from different chess engines (NanoGPT, Stockfish, etc.).
-   **Dynamic UI:** Includes components for move history, game controls, engine selection, and detailed AI analysis.

## 🚀 Getting Started

### Quick Start (Recommended)
From the project root, use the provided script to start both frontend and backend:

```bash
cd chessgpt_projects
bash start_both.sh
```

This will start:
- Backend API on `http://localhost:8000`
- Frontend on `http://localhost:3000`

### Manual Start
If you prefer to start the frontend separately:

```bash
cd chessgpt_projects/web
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

## 🔧 Troubleshooting

### "Address already in use" Error
If you see this error, it means a server is already running on the required port:

```bash
# Kill any existing processes
pkill -f "uvicorn"
pkill -f "vite"

# Or kill specific ports
lsof -ti:8000 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
```

### Port Configuration
- **Frontend**: Runs on port 3000 (configured in `vite.config.ts`)
- **Backend**: Runs on port 8000
- **API Proxy**: Frontend automatically proxies `/api/*` requests to the backend

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

Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser. The page will reload if you make edits.
