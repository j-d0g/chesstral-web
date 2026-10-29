# Web components

`ChessGame` is the game-view coordinator. It renders the chessboard, controls, timers, move navigation, and the research tabs. Landing and setup flows are handled by `LandingPage` and `GameSetup`.

## Components

| Component | Responsibility |
|---|---|
| `LandingPage.tsx` | Choose Challenge or Research Playground |
| `GameSetup.tsx` | Select engine, side, and competitive time format |
| `ChessGame.tsx` | Compose the active game view and handle board input |
| `EngineSelector.tsx` | Select an available API engine and model |
| `GameControls.tsx` | Start a game, flip the board, and resign |
| `Timer.tsx` | Render and tick the store-owned competitive clock |
| `MoveNavigation.tsx` | Navigate through the current game |
| `MoveHistory.tsx` | Display full move history and jump to a ply |
| `PositionInput.tsx` | Load a FEN or PGN position |
| `EvaluationBar.tsx` | Show mate-aware position evaluation |
| `EnhancedAnalysisPanel.tsx` | Analyze the game's moves |
| `AdvantageGraph.tsx` | Plot evaluation across analyzed moves |
| `MoveAnalysisList.tsx` | Show classifications and move details |
| `CommentaryBox.tsx` | Display AI thoughts and move-rating forms |
| `RatingForm.tsx` | Collect and submit five move ratings and a review |
| `TemperatureControl.tsx` | Configure AI temperature |
| `ChessGame.tsx` | Render the game-over result and rematch actions |

## State and utilities

Shared game state and actions live in `src/store/gameStore.ts`. Pure clock, evaluation, and move-analysis helpers are in `src/utils/`; opening-book parsing and matching are in `src/services/openingBook.ts`.

## Checks

Run `npm run typecheck`, `npm test`, and `npm run build` from the repository root.
