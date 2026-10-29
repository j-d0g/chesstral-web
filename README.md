# ChessGPT Web

React, TypeScript, and Vite frontend for ChessGPT.

## Development

Start the API from the sibling repository:

```bash
cd ../chesstral-api
.venv/bin/python -m uvicorn src.main:app --host 127.0.0.1 --port 8000
```

Then start the frontend:

```bash
npm ci
npm run dev -- --host 127.0.0.1
```

Vite serves the app at `http://127.0.0.1:3000` and proxies `/api` to the API on port 8000. Set `VITE_API_URL` to override the API base URL.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

Opening data in `public/data/` comes from [Lichess chess-openings](https://github.com/lichess-org/chess-openings) and is distributed under CC0 1.0.
