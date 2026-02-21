@echo off
echo Docling Application Auto-Start Script
echo This script activates the virtual environment and starts the FastAPI server

cd /d "%~dp0"

if not exist ".venv\" (
    echo [X] Virtual environment not found!
    echo    Creating virtual environment...
    python -m venv .venv
    
    echo [*] Installing dependencies...
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    echo [v] Virtual environment found
    call .venv\Scripts\activate.bat
)

echo.
echo [*] Working directory: %CD%
echo.

set HF_HUB_DISABLE_SYMLINKS_WARNING=1
set HF_HUB_DISABLE_SYMLINKS=1
set PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

echo [*] Starting Docling server on http://localhost:8008
echo    Press Ctrl+C to stop
echo.

uvicorn docling_app.main:app --reload --port 8008
