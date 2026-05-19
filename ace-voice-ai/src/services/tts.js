const axios = require('axios');
const { execFile } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const logger = require('../utils/logger');

// Naver Clova TTS — Korean
async function synthesizeKorean(text) {
  const params = new URLSearchParams({
    speaker: 'nara',   // natural-sounding Korean female voice
    text,
    volume: '0',
    speed: '-1',       // slightly slower for phone clarity
    pitch: '0',
    format: 'mp3',
  });

  const response = await axios.post(
    'https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts',
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-NCP-APIGW-API-KEY-ID': process.env.NAVER_CLIENT_ID,
        'X-NCP-APIGW-API-KEY': process.env.NAVER_CLIENT_SECRET,
      },
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data);
}

// Google Cloud TTS — English (Neural2)
async function synthesizeEnglish(text) {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const token = await auth.getAccessToken();

  const response = await axios.post(
    'https://texttospeech.googleapis.com/v1/text:synthesize',
    {
      input: { text },
      voice: { languageCode: 'en-US', name: 'en-US-Neural2-F' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return Buffer.from(response.data.audioContent, 'base64');
}

// Convert MP3 (or any format ffmpeg understands) → mulaw 8kHz raw PCM
// Twilio Media Streams require mulaw 8kHz
async function convertToMulaw8k(inputBuffer, inputFormat = 'mp3') {
  const tmpDir = os.tmpdir();
  const ts = Date.now();
  const inputPath = path.join(tmpDir, `tts_in_${ts}.${inputFormat}`);
  const outputPath = path.join(tmpDir, `tts_out_${ts}.ul`);

  await fs.promises.writeFile(inputPath, inputBuffer);

  await new Promise((resolve, reject) => {
    execFile(
      'ffmpeg',
      ['-y', '-i', inputPath, '-ar', '8000', '-ac', '1', '-f', 'mulaw', outputPath],
      (err, _stdout, stderr) => {
        if (err) {
          logger.error('ffmpeg conversion failed', { error: stderr });
          return reject(err);
        }
        resolve();
      }
    );
  });

  const mulawBuffer = await fs.promises.readFile(outputPath);
  await Promise.all([fs.promises.unlink(inputPath), fs.promises.unlink(outputPath)]);
  return mulawBuffer;
}

// Main entry: synthesize text → mulaw 8kHz buffer ready for Twilio
async function synthesize(text, language) {
  const mp3Buffer = language === 'ko' ? await synthesizeKorean(text) : await synthesizeEnglish(text);
  const mulawBuffer = await convertToMulaw8k(mp3Buffer);
  logger.debug('TTS synthesized', { language, textLength: text.length, mulawBytes: mulawBuffer.length });
  return mulawBuffer;
}

module.exports = { synthesize };
