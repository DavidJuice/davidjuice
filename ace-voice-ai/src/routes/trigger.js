const express = require('express');
const twilio = require('twilio');
const stateManager = require('../conversation/stateManager');
const logger = require('../utils/logger');

const router = express.Router();

function validateTriggerSecret(req, res, next) {
  const secret = req.headers['x-trigger-secret'] || req.body?.secret;
  if (!secret || secret !== process.env.TRIGGER_SECRET) {
    logger.warn('Trigger request with invalid secret', { ip: req.ip });
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

router.post('/outbound-call', validateTriggerSecret, async (req, res) => {
  const { clientName, phoneNumber, language, notes } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'phoneNumber is required' });
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  try {
    const call = await client.calls.create({
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: `${process.env.BASE_URL}/twilio/answer`,
      statusCallback: `${process.env.BASE_URL}/twilio/status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      machineDetection: 'DetectMessageEnd',
      machineDetectionTimeout: 30,
    });

    // Pre-seed session with client data before the call connects
    stateManager.createSession(call.sid, phoneNumber, { clientName, language, notes });

    logger.info('Outbound call initiated', {
      callSid: call.sid,
      to: phoneNumber,
      clientName,
      language,
    });

    res.json({ callSid: call.sid, status: 'initiated' });
  } catch (err) {
    logger.error('Failed to initiate outbound call', { error: err.message, phoneNumber });
    res.status(500).json({ error: 'Failed to initiate call', details: err.message });
  }
});

module.exports = router;
