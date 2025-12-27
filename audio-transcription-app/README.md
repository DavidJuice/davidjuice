# Audio Transcription App

High-quality audio transcription using OpenAI Whisper (local, free).

## Features
- Drag & drop audio files (.wav, .mp3, .m4a)
- Real-time progress tracking
- Korean & English support
- Copy transcription to clipboard
- Max file: 100MB, 2 hours duration

## Setup

### Backend (Python)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend (React)
```bash
cd frontend
npm install
npm start
```

Access: http://localhost:3000

## Usage
1. Select language (or auto-detect)
2. Drag/drop or click to upload audio
3. Click "Start Transcription"
4. Wait for progress to complete
5. Copy transcription with 📋 button

## Error Handling
- File validation (type, size)
- Network failure recovery
- Corrupted file detection
- API timeout handling

## Requirements
- Python 3.8+
- Node.js 14+
- 4GB+ RAM (for Whisper model)
