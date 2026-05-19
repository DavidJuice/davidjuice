// Korean Hangul syllables: U+AC00–U+D7A3
const KOREAN_RANGE = /[가-힣]/g;
const KOREAN_THRESHOLD = 0.1;

function detectLanguage(text) {
  if (!text || text.trim().length === 0) return 'en';
  const chars = text.replace(/\s/g, '');
  if (chars.length === 0) return 'en';
  const koreanChars = (text.match(KOREAN_RANGE) || []).length;
  return koreanChars / chars.length > KOREAN_THRESHOLD ? 'ko' : 'en';
}

const TRANSFER_KEYWORDS = {
  ko: ['직원', '상담원', '사람', '전화 연결', '연결해', '사람이랑'],
  en: ['agent', 'person', 'representative', 'transfer', 'someone', 'human', 'operator'],
};

function isTransferRequest(text, language) {
  const lower = text.toLowerCase();
  const keywords = language === 'ko' ? TRANSFER_KEYWORDS.ko : TRANSFER_KEYWORDS.en;
  // Also check English keywords regardless of detected language (bilingual speakers)
  const allKeywords = [...keywords, ...TRANSFER_KEYWORDS.en];
  return allKeywords.some((kw) => lower.includes(kw));
}

module.exports = { detectLanguage, isTransferRequest };
