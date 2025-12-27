#!/bin/bash

# Docling Application Auto-Start Script
# This script activates the virtual environment and starts the FastAPI server

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project directory
cd "$SCRIPT_DIR"

# Check if venv exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "   Creating virtual environment..."
    python3 -m venv .venv
    
    echo "📦 Installing dependencies..."
    source .venv/bin/activate
    pip install -r requirements.txt
else
    echo "✅ Virtual environment found"
    source .venv/bin/activate
fi

echo "🐍 Python: $(which python)"
echo "📂 Working directory: $(pwd)"
echo ""
echo "🚀 Starting Docling server on http://localhost:8008"
echo "   Press Ctrl+C to stop"
echo ""

# Start the FastAPI server
uvicorn docling_app.main:app --reload --port 8008
