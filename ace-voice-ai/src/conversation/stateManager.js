const sessions = new Map();

function createSession(callSid, clientPhone, overrides = {}) {
  const session = {
    callSid,
    clientPhone,
    language: overrides.language === 'Korean' ? 'ko' : overrides.language === 'English' ? 'en' : 'ko',
    state: 'GREETING',
    conversationHistory: [],
    clientName: overrides.clientName || null,
    notes: overrides.notes || null,
    tentativeDateTime: null,
    confirmedDateTime: null,
    streamSid: null,
    isProcessingResponse: false,
    callStartTime: new Date(),
    lastTranscript: null,
  };
  sessions.set(callSid, session);
  return session;
}

function getSession(callSid) {
  return sessions.get(callSid) || null;
}

function updateSession(callSid, patch) {
  const session = sessions.get(callSid);
  if (!session) return null;
  Object.assign(session, patch);
  return session;
}

function destroySession(callSid) {
  sessions.delete(callSid);
}

function getAllActiveSessions() {
  return Array.from(sessions.values()).map((s) => ({
    callSid: s.callSid,
    state: s.state,
    language: s.language,
    clientName: s.clientName,
    callStartTime: s.callStartTime,
  }));
}

module.exports = { createSession, getSession, updateSession, destroySession, getAllActiveSessions };
