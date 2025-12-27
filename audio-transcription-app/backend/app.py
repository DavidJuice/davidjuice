from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import os
import time
from werkzeug.utils import secure_filename
import threading

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a', 'ogg', 'flac'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Load Whisper model (base is good balance of speed/accuracy)
model = whisper.load_model("base")

# Store transcription progress
transcription_jobs = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def transcribe_audio(job_id, filepath, language):
    try:
        transcription_jobs[job_id]['status'] = 'processing'
        transcription_jobs[job_id]['progress'] = 10

        start_time = time.time()

        # Transcribe with Whisper
        result = model.transcribe(
            filepath,
            language=language if language != 'auto' else None,
            verbose=False
        )

        transcription_jobs[job_id]['progress'] = 100
        transcription_jobs[job_id]['status'] = 'completed'
        transcription_jobs[job_id]['text'] = result['text']
        transcription_jobs[job_id]['duration'] = time.time() - start_time

    except Exception as e:
        transcription_jobs[job_id]['status'] = 'failed'
        transcription_jobs[job_id]['error'] = str(e)
    finally:
        # Cleanup file
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    language = request.form.get('language', 'auto')

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

    try:
        filename = secure_filename(file.filename)
        job_id = f"{int(time.time() * 1000)}_{filename}"
        filepath = os.path.join(UPLOAD_FOLDER, job_id)
        file.save(filepath)

        # Initialize job
        transcription_jobs[job_id] = {
            'status': 'queued',
            'progress': 0,
            'text': '',
            'error': None
        }

        # Start transcription in background
        thread = threading.Thread(target=transcribe_audio, args=(job_id, filepath, language))
        thread.start()

        return jsonify({'job_id': job_id}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/status/<job_id>', methods=['GET'])
def get_status(job_id):
    if job_id not in transcription_jobs:
        return jsonify({'error': 'Job not found'}), 404

    job = transcription_jobs[job_id]

    # Estimate time remaining (rough estimate)
    time_remaining = None
    if job['status'] == 'processing' and job['progress'] > 10:
        # Whisper doesn't give granular progress, so we fake it
        time_remaining = 30  # Approximate

    return jsonify({
        'status': job['status'],
        'progress': job['progress'],
        'text': job['text'],
        'error': job['error'],
        'time_remaining': time_remaining
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
