const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const logger = require('../utils/logger');

function createDeepgramSession(callSid, onTranscript) {
  const dg = createClient(process.env.DEEPGRAM_API_KEY);

  const live = dg.listen.live({
    model: 'nova-2',
    language: 'multi',        // auto-detects Korean + English in the same call
    encoding: 'mulaw',        // matches Twilio's stream format exactly
    sample_rate: 8000,        // matches Twilio's 8kHz stream
    channels: 1,
    punctuate: true,
    interim_results: true,
    endpointing: 300,         // 300ms silence = end of utterance
    utterance_end_ms: 1000,
  });

  live.on(LiveTranscriptionEvents.Open, () => {
    logger.debug('Deepgram session opened', { callSid });
  });

  live.on(LiveTranscriptionEvents.Transcript, (data) => {
    const alt = data.channel?.alternatives?.[0];
    if (!alt) return;

    const transcript = alt.transcript;
    const isFinal = data.is_final;
    const detectedLang = alt.language || 'en';

    if (transcript.trim() && isFinal) {
      logger.info('STT transcript received', { callSid, language: detectedLang, transcript });
      onTranscript({ transcript, language: detectedLang, callSid });
    }
  });

  live.on(LiveTranscriptionEvents.Error, (err) => {
    logger.error('Deepgram error', { callSid, error: err.message });
  });

  live.on(LiveTranscriptionEvents.Close, () => {
    logger.debug('Deepgram session closed', { callSid });
  });

  return live;
}

module.exports = { createDeepgramSession };
