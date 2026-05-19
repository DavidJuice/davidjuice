const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getClaudeResponse(conversationHistory, systemPrompt) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: systemPrompt,
    messages: conversationHistory,
  });

  const text = response.content[0].text;
  logger.info('Claude response', {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });
  return text;
}

// Extracts action markers from Claude's response and returns clean spoken text
function parseClaudeResponse(text) {
  const appointmentMatch = text.match(
    /\[APPOINTMENT_CONFIRMED:\s*([^,\]]+),\s*([^\]]+)\]/
  );
  const transferMatch = text.includes('[TRANSFER_NOW]');
  const callEndMatch = text.includes('[CALL_END]');

  const spokenText = text
    .replace(/\[APPOINTMENT_CONFIRMED:[^\]]+\]/g, '')
    .replace(/\[TRANSFER_NOW\]/g, '')
    .replace(/\[CALL_END\]/g, '')
    .trim();

  return { spokenText, appointmentMatch, transferMatch, callEndMatch };
}

module.exports = { getClaudeResponse, parseClaudeResponse };
