#!/usr/bin/env node
/**
 * Quick CLI test for the Ace Insurance Voice AI conversation.
 * Uses the same Claude prompts as the real phone system.
 * Run: node test-chat.js [ko|en]
 */
require('dotenv').config();
const readline = require('readline');
const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, buildGreeting } = require('./src/conversation/prompts');
const { parseClaudeResponse } = require('./src/services/claude');
const { detectLanguage } = require('./src/utils/languageDetect');

const language = process.argv[2] === 'en' ? 'en' : 'ko';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const history = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

async function chat(userInput) {
  history.push({ role: 'user', content: userInput });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const raw = response.content[0].text;
  const { spokenText, appointmentMatch, transferMatch, callEndMatch } = parseClaudeResponse(raw);

  history.push({ role: 'assistant', content: raw });

  console.log(`\n${CYAN}${BOLD}AI:${RESET} ${GREEN}${spokenText}${RESET}`);

  if (appointmentMatch) {
    const [, name, datetime] = appointmentMatch;
    console.log(`\n${YELLOW}★  APPOINTMENT CONFIRMED${RESET}`);
    console.log(`   Client:   ${name.trim()}`);
    console.log(`   DateTime: ${datetime.trim()}`);
    console.log(`   → In the real system, a Google Calendar event would be created now.`);
    console.log(`   → Apptoto would then send an SMS confirmation.\n`);
  }

  if (transferMatch) {
    console.log(`\n${YELLOW}★  TRANSFER TRIGGERED${RESET}`);
    console.log(`   → In the real system, the call would be transferred to ${process.env.ACE_BRANCH_PHONE_NUMBER || 'ACE_BRANCH_PHONE_NUMBER'}\n`);
  }

  if (callEndMatch) {
    console.log(`\n${DIM}(Call ended)${RESET}\n`);
    rl.close();
    process.exit(0);
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY not set. Copy .env.example to .env and add your key.');
    process.exit(1);
  }

  const greeting = buildGreeting(language, null);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Ace Insurance Voice AI — Terminal Test`);
  console.log(`  Language: ${language === 'ko' ? 'Korean (한국어)' : 'English'}`);
  console.log(`  Type your message. Type ${BOLD}quit${RESET} to exit.`);
  console.log(`${'─'.repeat(60)}\n`);
  console.log(`${CYAN}${BOLD}AI:${RESET} ${GREEN}${greeting}${RESET}\n`);

  history.push({ role: 'assistant', content: greeting });

  function prompt() {
    rl.question(`${BOLD}You:${RESET} `, async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed.toLowerCase() === 'quit') {
        console.log('\nGoodbye!\n');
        rl.close();
        return;
      }
      try {
        await chat(trimmed);
      } catch (err) {
        console.error('Error:', err.message);
      }
      prompt();
    });
  }

  prompt();
}

main();
