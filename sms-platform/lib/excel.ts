import * as XLSX from "xlsx";

export interface ParsedContact {
  phone: string;
  name: string;
  message?: string;
  language?: string;
}

export interface ParseResult {
  contacts: ParsedContact[];
  hasCustomMessages: boolean;
  errors: string[];
}

/**
 * Normalizes a phone number to E.164 format.
 * Handles US (+1), Korean (+82), Mexican (+52), and Chinese (+86) numbers.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[^\d+]/g, "");

  // Already E.164
  if (cleaned.startsWith("+")) return cleaned;

  // Korean mobile: 010-XXXX-XXXX (11 digits starting with 010)
  if (cleaned.startsWith("010") && cleaned.length === 11) {
    return `+82${cleaned.substring(1)}`;
  }
  if (cleaned.startsWith("8210") && cleaned.length === 13) {
    return `+${cleaned}`;
  }

  // Mexican mobile: 10 digits starting with common prefixes (55, 33, 81, etc.)
  // Mexico country code is +52; local numbers are 10 digits
  if (cleaned.startsWith("52") && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  // 10-digit Mexican number without country code — ambiguous with US, require explicit +52

  // Chinese mobile: 11 digits starting with 1 (13X, 14X, 15X, 16X, 17X, 18X, 19X)
  if (cleaned.startsWith("1") && cleaned.length === 11 && /^1[3-9]\d{9}$/.test(cleaned)) {
    return `+86${cleaned}`;
  }
  if (cleaned.startsWith("86") && cleaned.length === 13) {
    return `+${cleaned}`;
  }

  // US/Canada: 10 digits
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;

  return null;
}

/**
 * Detects whether a string contains non-ASCII Unicode characters
 * (Korean, Chinese, Japanese, Arabic, etc.) that require UCS-2 SMS encoding.
 * UCS-2 messages are limited to 70 chars/segment vs 160 for GSM-7.
 */
export function requiresUnicode(text: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(text);
}

/**
 * Returns SMS segment info for character counting in the UI.
 */
export function getSmsSegmentInfo(text: string): {
  chars: number;
  charsPerSegment: number;
  segments: number;
  isUnicode: boolean;
} {
  const isUnicode = requiresUnicode(text);
  const charsPerSegment = isUnicode ? 70 : 160;
  const chars = text.length;
  const segments = chars === 0 ? 0 : Math.ceil(chars / charsPerSegment);
  return { chars, charsPerSegment, segments, isUnicode };
}

/**
 * Parses an Excel or CSV buffer into a list of contacts.
 *
 * Supported column headers (case-insensitive):
 *
 * PHONE:
 *   English:  phone, number, mobile, cell
 *   Korean:   전화번호, 휴대폰, 연락처
 *   Spanish:  teléfono, telefono, celular, móvil, movil, número, numero
 *   Chinese:  电话, 电话号码, 手机, 手机号, 联系方式
 *
 * NAME:
 *   English:  name, full name, fullname, contact
 *   Korean:   이름, 성함, 성명
 *   Spanish:  nombre, nombre completo
 *   Chinese:  姓名, 名字, 姓名, 联系人
 *
 * MESSAGE (optional per-contact message):
 *   English:  message, msg, text, sms
 *   Korean:   메시지, 문자
 *   Spanish:  mensaje, texto
 *   Chinese:  消息, 短信, 内容
 *
 * LANGUAGE (optional hint: en / ko / es / zh):
 *   English:  language, lang
 *   Korean:   언어
 *   Spanish:  idioma, lengua
 *   Chinese:  语言
 */
export function parseContactsFile(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const contacts: ParsedContact[] = [];
  const errors: string[] = [];
  let hasCustomMessages = false;

  const normalize = (key: string) => key.toLowerCase().trim();

  const PHONE_ALIASES = [
    // English
    "phone", "number", "mobile", "cell", "telephone",
    // Korean
    "전화번호", "휴대폰", "연락처",
    // Spanish
    "teléfono", "telefono", "celular", "móvil", "movil", "número", "numero",
    // Chinese (Simplified)
    "电话", "电话号码", "手机", "手机号", "联系方式",
  ];

  const NAME_ALIASES = [
    // English
    "name", "full name", "fullname", "contact", "first name", "firstname",
    // Korean
    "이름", "성함", "성명",
    // Spanish
    "nombre", "nombre completo",
    // Chinese
    "姓名", "名字", "联系人",
  ];

  const MESSAGE_ALIASES = [
    // English
    "message", "msg", "text", "sms", "body",
    // Korean
    "메시지", "문자",
    // Spanish
    "mensaje", "texto",
    // Chinese
    "消息", "短信", "内容",
  ];

  const LANGUAGE_ALIASES = [
    // English
    "language", "lang",
    // Korean
    "언어",
    // Spanish
    "idioma", "lengua",
    // Chinese
    "语言",
  ];

  rows.forEach((row, index) => {
    const rowNum = index + 2;

    const get = (aliases: string[]) => {
      for (const alias of aliases) {
        const match = Object.keys(row).find((k) => normalize(k) === alias);
        if (match) return String(row[match]).trim();
      }
      return "";
    };

    const rawPhone = get(PHONE_ALIASES);
    const name = get(NAME_ALIASES) || "Unknown";
    const message = get(MESSAGE_ALIASES);
    const language = get(LANGUAGE_ALIASES);

    if (!rawPhone) {
      errors.push(`Row ${rowNum}: missing phone number`);
      return;
    }

    const phone = normalizePhone(rawPhone);
    if (!phone) {
      errors.push(`Row ${rowNum}: invalid phone number "${rawPhone}"`);
      return;
    }

    if (message) hasCustomMessages = true;

    contacts.push({
      phone,
      name,
      message: message || undefined,
      language: language || undefined,
    });
  });

  return { contacts, hasCustomMessages, errors };
}
