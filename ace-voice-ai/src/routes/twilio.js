const express = require('express');
const twilio = require('twilio');
const { WebSocket } = require('ws');
const stateManager = require('../conversation/stateManager');
const { createDeepgramSession } = require('../services/deepgram');
const { getClaudeResponse, parseClaudeResponse } = require('../services/claude');
const { synthesize } = require('../services/tts');
const { createAppointment } = require('../services/calendar');
const { SYSTEM_PROMPT, buildGreeting } = require('../conversation/prompts');
const SCRIPTS = require('../conversation/scripts');
const { detectLanguage, isTransferRequest } = require('../utils/languageDetect');
const logger = require('../utils/logger');

const router = express.Router();

// POST /twilio/answer — initial TwiML when call connects
router.post('/answer', (req, res) => {
  const { CallSid, AnsweredBy } = req.body;

  // AMD: if Twilio detected voicemail, hang up immediately
  if (AnsweredBy && AnsweredBy.startsWith('machine')) {
    logger.info('AMD detected voicemail, hanging up', { CallSid, AnsweredBy });
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.hangup();
    return res.type('text/xml').send(twiml.toString());
  }

  logger.info('Call answered, starting stream', { CallSid, AnsweredBy });

  const streamUrl = process.env.BASE_URL
    ? `wss://${new URL(process.env.BASE_URL).host}/twilio/stream`
    : `wss://${req.hostname}/twilio/stream`;

  const twiml = new twilio.twiml.VoiceResponse();
  const connect = twiml.connect();
  connect.stream({ url: streamUrl });

  res.type('text/xml').send(twiml.toString());
});

// POST /twilio/status — call lifecycle events
router.post('/status', (req, res) => {
  const { CallSid, CallStatus, CallDuration, AnsweredBy } = req.body;
  logger.info('Call status update', { CallSid, CallStatus, CallDuration, AnsweredBy });
  res.sendStatus(200);
});

// POST /twilio/transfer-complete — called after transfer <Dial> ends
router.post('/transfer-complete', (req, res) => {
  const { CallSid, DialCallStatus } = req.body;
  logger.info('Transfer completed', { CallSid, DialCallStatus });
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.hangup();
  res.type('text/xml').send(twiml.toString());
});

// ─── WebSocket audio pipeline ────────────────────────────────────────────────

async function sendAudioToTwilio(ws, streamSid, mulawBuffer) {
  // Send mulaw PCM in 160-byte frames (20ms at 8kHz = 160 bytes)
  const CHUNK_SIZE = 160;
  for (let i = 0; i < mulawBuffer.length; i += CHUNK_SIZE) {
    if (ws.readyState !== WebSocket.OPEN) break;
    const chunk = mulawBuffer.slice(i, i + CHUNK_SIZE);
    ws.send(
      JSON.stringify({
        event: 'media',
        streamSid,
        media: { payload: chunk.toString('base64') },
      })
    );
  }
  // Mark signals Twilio that this audio segment is done
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event: 'mark', streamSid, mark: { name: `end-${Date.now()}` } }));
  }
}

async function speakText(ws, streamSid, text, language) {
  if (!text || !text.trim()) return;
  try {
    const mulawBuffer = await synthesize(text, language);
    await sendAudioToTwilio(ws, streamSid, mulawBuffer);
  } catch (err) {
    logger.error('TTS failed', { error: err.message, text: text.substring(0, 50) });
  }
}

async function handleTransfer(ws, callSid, streamSid, session) {
  const lang = session.language;
  logger.info('Initiating call transfer', { callSid, language: lang });

  try {
    await speakText(ws, streamSid, SCRIPTS.transferring[lang], lang);

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.calls(callSid).update({
      twiml: `<Response><Dial timeout="30" action="${process.env.BASE_URL}/twilio/transfer-complete"><Number>${process.env.ACE_BRANCH_PHONE_NUMBER}</Number></Dial></Response>`,
    });

    stateManager.updateSession(callSid, { state: 'TRANSFER_FLOW' });
  } catch (err) {
    logger.error('Transfer failed', { callSid, error: err.message });
    await speakText(ws, streamSid, SCRIPTS.transferFailed[lang], lang);
  }
}

async function handleAppointmentConfirmed(ws, callSid, streamSid, session, appointmentMatch, spokenText) {
  const [, rawName, rawDatetime] = appointmentMatch;
  const clientName = rawName.trim();
  const datetimeStr = rawDatetime.trim();

  stateManager.updateSession(callSid, {
    clientName,
    confirmedDateTime: datetimeStr,
    state: 'CALL_END',
  });

  // Speak the confirmation text Claude provided first
  if (spokenText) {
    await speakText(ws, streamSid, spokenText, session.language);
  }

  // Create Google Calendar event (Apptoto picks it up for SMS)
  try {
    await createAppointment({
      clientName,
      phoneNumber: session.clientPhone,
      language: session.language,
      confirmedDateTime: datetimeStr,
    });
  } catch (err) {
    logger.error('Calendar event creation failed', { callSid, error: err.message });
    // Don't tell caller — appointment was confirmed verbally; log for manual follow-up
  }

  await speakText(ws, streamSid, SCRIPTS.goodbye[session.language], session.language);
}

async function handleTranscript(ws, callSid, streamSid, { transcript, language }) {
  const session = stateManager.getSession(callSid);
  if (!session) return;
  if (session.isProcessingResponse) {
    logger.debug('Dropping transcript — response in progress', { callSid, transcript });
    return;
  }

  stateManager.updateSession(callSid, { isProcessingResponse: true, lastTranscript: transcript });

  try {
    // Refine language detection using our local heuristic + Deepgram's detection
    const localLang = detectLanguage(transcript);
    const effectiveLang = localLang !== 'en' ? localLang : language === 'ko' ? 'ko' : 'en';
    stateManager.updateSession(callSid, { language: effectiveLang });

    logger.info('Processing transcript', { callSid, language: effectiveLang, transcript });

    // Fast-path: transfer keywords before calling Claude
    if (isTransferRequest(transcript, effectiveLang)) {
      await handleTransfer(ws, callSid, streamSid, session);
      return;
    }

    // Append user turn to conversation history
    session.conversationHistory.push({ role: 'user', content: transcript });

    const rawResponse = await getClaudeResponse(session.conversationHistory, SYSTEM_PROMPT);
    logger.info('Claude response', { callSid, response: rawResponse.substring(0, 100) });

    // Append assistant turn
    session.conversationHistory.push({ role: 'assistant', content: rawResponse });
    stateManager.updateSession(callSid, { conversationHistory: session.conversationHistory });

    const { spokenText, appointmentMatch, transferMatch, callEndMatch } = parseClaudeResponse(rawResponse);

    if (transferMatch) {
      await handleTransfer(ws, callSid, streamSid, session);
    } else if (appointmentMatch) {
      await handleAppointmentConfirmed(ws, callSid, streamSid, session, appointmentMatch, spokenText);
    } else if (callEndMatch) {
      await speakText(ws, streamSid, spokenText || SCRIPTS.goodbye[effectiveLang], effectiveLang);
      stateManager.updateSession(callSid, { state: 'CALL_END' });
    } else {
      await speakText(ws, streamSid, spokenText, effectiveLang);
      stateManager.updateSession(callSid, { state: 'DETECT_INTENT' });
    }
  } catch (err) {
    logger.error('Error handling transcript', { callSid, error: err.message });
  } finally {
    stateManager.updateSession(callSid, { isProcessingResponse: false });
  }
}

// Exported WebSocket handler — attached to http.Server in server.js
async function handleTwilioStream(ws) {
  let callSid = null;
  let streamSid = null;
  let dgSession = null;
  let silenceTimer = null;

  function resetSilenceTimer(session) {
    clearTimeout(silenceTimer);
    if (!session) return;
    silenceTimer = setTimeout(async () => {
      logger.debug('Silence detected, prompting caller', { callSid });
      await speakText(ws, streamSid, SCRIPTS.silence[session.language], session.language);
    }, 8000); // 8 seconds of silence
  }

  ws.on('message', async (rawMessage) => {
    let msg;
    try {
      msg = JSON.parse(rawMessage);
    } catch {
      return;
    }

    switch (msg.event) {
      case 'start': {
        callSid = msg.start.callSid;
        streamSid = msg.start.streamSid;
        logger.info('Twilio stream started', { callSid, streamSid });

        // Retrieve pre-seeded session (outbound) or create new (inbound)
        let session = stateManager.getSession(callSid);
        if (!session) {
          session = stateManager.createSession(callSid, 'unknown');
        }
        stateManager.updateSession(callSid, { streamSid, state: 'GREETING' });
        session = stateManager.getSession(callSid);

        // Open Deepgram STT session
        dgSession = createDeepgramSession(callSid, (transcriptData) => {
          resetSilenceTimer(stateManager.getSession(callSid));
          handleTranscript(ws, callSid, streamSid, transcriptData);
        });

        // Send greeting
        const greeting = buildGreeting(session.language, session.clientName);
        await speakText(ws, streamSid, greeting, session.language);
        resetSilenceTimer(session);
        break;
      }

      case 'media': {
        // Forward raw mulaw audio directly to Deepgram (no decoding needed)
        if (dgSession && msg.media?.payload) {
          const audioBuffer = Buffer.from(msg.media.payload, 'base64');
          dgSession.send(audioBuffer);
        }
        break;
      }

      case 'mark': {
        logger.debug('Twilio mark received', { callSid, mark: msg.mark?.name });
        break;
      }

      case 'stop': {
        logger.info('Twilio stream stopped', { callSid });
        clearTimeout(silenceTimer);
        if (dgSession) dgSession.finish();
        if (callSid) stateManager.destroySession(callSid);
        break;
      }
    }
  });

  ws.on('close', () => {
    clearTimeout(silenceTimer);
    if (dgSession) dgSession.finish();
    if (callSid) stateManager.destroySession(callSid);
    logger.info('WebSocket connection closed', { callSid });
  });

  ws.on('error', (err) => {
    logger.error('WebSocket error', { callSid, error: err.message });
  });
}

module.exports = router;
module.exports.handleTwilioStream = handleTwilioStream;
