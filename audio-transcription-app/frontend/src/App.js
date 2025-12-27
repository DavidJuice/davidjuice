import React, { useState, useRef } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000';
const ALLOWED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-m4a', 'audio/m4a'];

function App() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('auto');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return 'No file selected';

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['wav', 'mp3', 'm4a', 'ogg', 'flac'].includes(ext)) {
      return 'Invalid file type. Use: .wav, .mp3, .m4a';
    }

    if (file.size > 100 * 1024 * 1024) {
      return 'File too large. Max 100MB';
    }

    return null;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    const err = validateFile(droppedFile);
    if (err) {
      setError(err);
      return;
    }
    setFile(droppedFile);
    setError('');
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    const err = validateFile(selectedFile);
    if (err) {
      setError(err);
      return;
    }
    setFile(selectedFile);
    setError('');
  };

  const pollStatus = async (jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/status/${jobId}`);
        const data = await res.json();

        setProgress(data.progress);
        setTimeRemaining(data.time_remaining);

        if (data.status === 'completed') {
          setTranscription(data.text);
          setTranscribing(false);
          clearInterval(interval);
        } else if (data.status === 'failed') {
          setError(data.error || 'Transcription failed');
          setTranscribing(false);
          clearInterval(interval);
        }
      } catch (err) {
        setError('Failed to get status');
        setTranscribing(false);
        clearInterval(interval);
      }
    }, 1000);
  };

  const handleTranscribe = async () => {
    if (!file) return;

    setTranscribing(true);
    setProgress(0);
    setTranscription('');
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      pollStatus(data.job_id);
    } catch (err) {
      setError(err.message);
      setTranscribing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
  };

  return (
    <div className="App">
      <h1>Audio Transcription</h1>

      <div className="controls">
        <label>
          Language:
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="ko">Korean</option>
          </select>
        </label>
      </div>

      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => fileInputRef.current.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,.m4a"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        {file ? (
          <p>📁 {file.name}</p>
        ) : (
          <p>Drag & drop audio file or click to select<br/>
          <small>Supports: .wav, .mp3, .m4a (max 100MB)</small></p>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <button
        onClick={handleTranscribe}
        disabled={!file || transcribing}
        className="transcribe-btn"
      >
        {transcribing ? 'Transcribing...' : 'Start Transcription'}
      </button>

      {transcribing && (
        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p>{progress}% {timeRemaining ? `• ~${timeRemaining}s remaining` : ''}</p>
        </div>
      )}

      {transcription && (
        <div className="result-section">
          <div className="result-header">
            <h2>Transcription</h2>
            <button onClick={copyToClipboard} className="copy-btn">
              📋 Copy
            </button>
          </div>
          <div className="transcription-text">{transcription}</div>
        </div>
      )}
    </div>
  );
}

export default App;
