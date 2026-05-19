// Scripted phrases that bypass Claude for predictable moments (lower latency/cost)
const SCRIPTS = {
  transferring: {
    ko: '잠시만요, 직원에게 연결해 드리겠습니다.',
    en: "Please hold, I'm connecting you to a live agent now.",
  },
  transferFailed: {
    ko: '죄송합니다. 현재 연결이 어렵습니다. 잠시 후 다시 전화해 주세요.',
    en: "I'm sorry, we couldn't connect you right now. Please call back during business hours.",
  },
  goodbye: {
    ko: '감사합니다. 좋은 하루 되세요.',
    en: 'Thank you for calling Ace Insurance. Have a great day!',
  },
  appointmentConfirmed: {
    ko: (name, dt) => `알겠습니다, ${name}님. ${dt}에 상담 예약이 확정되었습니다. 문자로 확인 메시지를 보내드리겠습니다.`,
    en: (name, dt) => `Perfect, ${name}. Your appointment is confirmed for ${dt}. You'll receive a text confirmation shortly.`,
  },
  silence: {
    ko: '혹시 거기 계세요? 무엇을 도와드릴까요?',
    en: "Are you still there? How can I help you?",
  },
};

module.exports = SCRIPTS;
