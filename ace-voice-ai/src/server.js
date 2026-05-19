require('dotenv').config();
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const logger = require('./utils/logger');
const { getAllActiveSessions } = require('./conversation/stateManager');
const twilioRouter = require('./routes/twilio');
const { handleTwilioStream } = require('./routes/twilio');
const triggerRouter = require('./routes/trigger');

const app = express();

// Twilio webhook bodies are application/x-www-form-urlencoded — not JSON
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/twilio', twilioRouter);
app.use('/trigger', triggerRouter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    activeCalls: getAllActiveSessions().length,
  });
});

// Optional: list active sessions for debugging
app.get('/admin/sessions', (_req, res) => {
  res.json(getAllActiveSessions());
});

const server = http.createServer(app);

// WebSocket server must be attached to the http.Server — Express cannot handle WS upgrades
const wss = new WebSocketServer({ server, path: '/twilio/stream' });
wss.on('connection', handleTwilioStream);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  logger.info('Ace Voice AI server started', {
    port: PORT,
    baseUrl: process.env.BASE_URL || '(not set)',
    nodeEnv: process.env.NODE_ENV || 'development',
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});
