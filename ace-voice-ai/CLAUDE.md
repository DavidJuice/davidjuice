# Ace Voice AI — Claude Code Context

## What This Is
A bilingual (Korean/English) outbound voice AI for Ace Insurance & Retirement Services.
Staff marks a Google Sheets row "Call Today" → Apps Script POSTs to this server → Twilio calls the client → real-time AI conversation → Google Calendar appointment.

## Runtime
- Node.js 20+ (CommonJS — `require()`, not `import`)
- Entry point: `src/server.js`
- Dev: `npm run dev` (node --watch)
- Test: `npm test` (node:test, no jest)

## Secrets
- Copy `.env.example` to `.env` and fill in real values
- Never commit `.env`
- `GOOGLE_SERVICE_ACCOUNT_JSON` is the full JSON as a single-line string

## Audio Pipeline (most critical path)
```
Twilio WebSocket → mulaw 8kHz audio chunks (base64)
  → Deepgram LiveClient (mulaw 8kHz, language: 'multi')
  → transcript (KO or EN detected automatically)
  → Claude API (max_tokens=200, short phone responses)
  → response text with optional action markers
  → Naver Clova TTS (KO) or Google TTS (EN) → MP3
  → ffmpeg → mulaw 8kHz → 160-byte chunks → Twilio WebSocket
```

## Conversation State Machine
States: `GREETING` → `DETECT_INTENT` → `SCHEDULE_FLOW` → `TRANSFER_FLOW` → `CALL_END`
State is stored in-memory per callSid in `src/conversation/stateManager.js`.

## Claude Response Markers
Claude embeds these in its response text (stripped before TTS):
- `[APPOINTMENT_CONFIRMED: clientName, 2025-05-14T14:00:00]` — create calendar event
- `[TRANSFER_NOW]` — bridge call to ACE_BRANCH_PHONE_NUMBER
- `[CALL_END]` — speak goodbye and hang up

## Transfer Keywords (always transfer if detected)
- Korean: 직원, 상담원, 사람, 전화 연결
- English: agent, person, representative, transfer, someone

## Key External Services
- Twilio: https://www.twilio.com/docs/voice/twiml/stream
- Deepgram: https://developers.deepgram.com/docs/getting-started-with-live-streaming-audio
- Naver Clova TTS: https://api.naver.com/tts-premium/v1/tts
- Google Calendar API v3: https://developers.google.com/calendar/api/v3/reference

## Manual Setup Steps (one-time, before first run)
1. Share Google Calendar with the service account email → "Make changes to events" permission
2. Verify Apptoto is connected to the same calendar ID in `GOOGLE_CALENDAR_ID`
3. Set Twilio webhook URLs to `${BASE_URL}/twilio/answer` and `${BASE_URL}/twilio/status`
4. For local dev: run `ngrok http 8080` and set `BASE_URL` to the ngrok HTTPS URL
5. In Google Sheets Apps Script: set `TRIGGER_SECRET` in Script Properties (not hardcoded)
