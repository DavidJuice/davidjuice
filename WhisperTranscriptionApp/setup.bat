@echo off
echo ========================================
echo WhisperTranscription App Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed!
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo Python found!
echo.

REM Install required packages
echo Installing required packages...
echo This may take a few minutes...
echo.

pip install --upgrade pip
pip install openai pyinstaller

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo You can now:
echo   1. Run the app:  python transcription_app.py
echo   2. Build .exe:   build.bat
echo.
pause
