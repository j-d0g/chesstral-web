#!/bin/bash

# ChessGPT Web Frontend Startup Script

echo "🚀 Starting ChessGPT Web v2.0..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the development server
echo "🌐 Starting Vite dev server on http://localhost:3000"
echo "🔄 Press Ctrl+C to stop the server"

npm run dev 