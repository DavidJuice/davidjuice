const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy env vars before requiring modules that read them at load time
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';

const { detectLanguage, isTransferRequest } = require('../src/utils/languageDetect');
const { parseClaudeResponse } = require('../src/services/claude');
const stateManager = require('../src/conversation/stateManager');
const { buildGreeting } = require('../src/conversation/prompts');
const SCRIPTS = require('../src/conversation/scripts');

// ─── languageDetect ───────────────────────────────────────────────────────────

describe('detectLanguage', () => {
  it('detects Korean text', () => {
    assert.equal(detectLanguage('안녕하세요 에이스 보험입니다'), 'ko');
  });

  it('detects English text', () => {
    assert.equal(detectLanguage('Hello I would like to schedule an appointment'), 'en');
  });

  it('returns en for empty string', () => {
    assert.equal(detectLanguage(''), 'en');
  });

  it('detects Korean when mixed but predominantly Korean', () => {
    assert.equal(detectLanguage('저는 appointment 예약하고 싶어요'), 'ko');
  });
});

describe('isTransferRequest', () => {
  it('detects Korean transfer keywords', () => {
    assert.equal(isTransferRequest('직원 연결해주세요', 'ko'), true);
    assert.equal(isTransferRequest('상담원이랑 얘기하고 싶어요', 'ko'), true);
  });

  it('detects English transfer keywords', () => {
    assert.equal(isTransferRequest('Can I speak to an agent please', 'en'), true);
    assert.equal(isTransferRequest('transfer me to someone', 'en'), true);
  });

  it('does not trigger on normal conversation', () => {
    assert.equal(isTransferRequest('I want to schedule an appointment', 'en'), false);
    assert.equal(isTransferRequest('예약하고 싶어요', 'ko'), false);
  });
});

// ─── parseClaudeResponse ──────────────────────────────────────────────────────

describe('parseClaudeResponse', () => {
  it('extracts APPOINTMENT_CONFIRMED marker with name and datetime', () => {
    const text = '예약을 확정하겠습니다.\n[APPOINTMENT_CONFIRMED: 김민수, 2025-06-10T14:00:00]';
    const result = parseClaudeResponse(text);
    assert.ok(result.appointmentMatch);
    assert.equal(result.appointmentMatch[1].trim(), '김민수');
    assert.equal(result.appointmentMatch[2].trim(), '2025-06-10T14:00:00');
    assert.equal(result.spokenText, '예약을 확정하겠습니다.');
    assert.equal(result.transferMatch, false);
    assert.equal(result.callEndMatch, false);
  });

  it('extracts TRANSFER_NOW marker', () => {
    const text = '연결해 드리겠습니다.\n[TRANSFER_NOW]';
    const result = parseClaudeResponse(text);
    assert.equal(result.transferMatch, true);
    assert.equal(result.spokenText, '연결해 드리겠습니다.');
    assert.equal(result.appointmentMatch, null);
  });

  it('extracts CALL_END marker', () => {
    const text = 'Thank you for calling!\n[CALL_END]';
    const result = parseClaudeResponse(text);
    assert.equal(result.callEndMatch, true);
    assert.equal(result.spokenText, 'Thank you for calling!');
  });

  it('returns original text when no markers present', () => {
    const text = 'What date works best for you?';
    const result = parseClaudeResponse(text);
    assert.equal(result.spokenText, text);
    assert.equal(result.appointmentMatch, null);
    assert.equal(result.transferMatch, false);
    assert.equal(result.callEndMatch, false);
  });

  it('handles English APPOINTMENT_CONFIRMED', () => {
    const text = 'Great! [APPOINTMENT_CONFIRMED: John Smith, 2025-06-15T10:00:00]';
    const result = parseClaudeResponse(text);
    assert.equal(result.appointmentMatch[1].trim(), 'John Smith');
    assert.equal(result.appointmentMatch[2].trim(), '2025-06-15T10:00:00');
    assert.equal(result.spokenText, 'Great!');
  });
});

// ─── stateManager ─────────────────────────────────────────────────────────────

describe('stateManager', () => {
  const testSid = 'CA_test_12345';

  after(() => {
    stateManager.destroySession(testSid);
  });

  it('creates a session with defaults', () => {
    const session = stateManager.createSession(testSid, '+12065550100');
    assert.equal(session.callSid, testSid);
    assert.equal(session.clientPhone, '+12065550100');
    assert.equal(session.state, 'GREETING');
    assert.equal(session.language, 'ko'); // default
    assert.deepEqual(session.conversationHistory, []);
  });

  it('maps language strings correctly', () => {
    const sid2 = 'CA_test_en';
    const session = stateManager.createSession(sid2, '+12065550101', { language: 'English' });
    assert.equal(session.language, 'en');
    stateManager.destroySession(sid2);
  });

  it('retrieves a session by callSid', () => {
    const session = stateManager.getSession(testSid);
    assert.ok(session);
    assert.equal(session.callSid, testSid);
  });

  it('updates session fields', () => {
    stateManager.updateSession(testSid, { state: 'SCHEDULE_FLOW', clientName: '김민수' });
    const session = stateManager.getSession(testSid);
    assert.equal(session.state, 'SCHEDULE_FLOW');
    assert.equal(session.clientName, '김민수');
  });

  it('returns null for unknown callSid', () => {
    assert.equal(stateManager.getSession('CA_nonexistent'), null);
  });

  it('destroys session', () => {
    stateManager.destroySession(testSid);
    assert.equal(stateManager.getSession(testSid), null);
  });
});

// ─── prompts / scripts ───────────────────────────────────────────────────────

describe('buildGreeting', () => {
  it('returns Korean greeting with name', () => {
    const greeting = buildGreeting('ko', '김민수');
    assert.ok(greeting.includes('김민수'));
    assert.ok(greeting.includes('에이스 보험'));
  });

  it('returns Korean greeting without name', () => {
    const greeting = buildGreeting('ko', null);
    assert.ok(greeting.includes('에이스 보험'));
  });

  it('returns English greeting with name', () => {
    const greeting = buildGreeting('en', 'John');
    assert.ok(greeting.includes('John'));
    assert.ok(greeting.includes('Ace Insurance'));
  });

  it('returns English greeting without name', () => {
    const greeting = buildGreeting('en', null);
    assert.ok(greeting.includes('Ace Insurance'));
  });
});

describe('SCRIPTS', () => {
  it('has Korean and English transferring phrases', () => {
    assert.ok(SCRIPTS.transferring.ko.length > 0);
    assert.ok(SCRIPTS.transferring.en.length > 0);
  });

  it('appointmentConfirmed is a function returning localized string', () => {
    const koMsg = SCRIPTS.appointmentConfirmed.ko('김민수', '6월 10일 오후 2시');
    assert.ok(koMsg.includes('김민수'));

    const enMsg = SCRIPTS.appointmentConfirmed.en('John', 'June 10th at 2 PM');
    assert.ok(enMsg.includes('John'));
  });
});
