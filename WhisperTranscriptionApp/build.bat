@echo off
echo Building WhisperTranscription App...
echo.

REM Install required packages
echo Installing required packages...
pip install pyinstaller openai

echo.
echo Building executable...
python build_exe.py

echo.
echo Done! Check the 'dist' folder for WhisperTranscription.exe
pause
