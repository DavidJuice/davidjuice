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
 * Normalizes a phone number to E.164 format (+1XXXXXXXXXX for US numbers).
 * Handles Korean numbers (+82) and US numbers (+1).
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  // Remove all non-digit and non-plus characters
  const cleaned = String(raw).replace(/[^\d+]/g, "");

  // If it starts with +, assume already E.164
  if (cleaned.startsWith("+")) return cleaned;

  // Korean numbers: 010-XXXX-XXXX → +8210XXXXXXXX
  if (cleaned.startsWith("010") && cleaned.length === 11) {
    return `+82${cleaned.substring(1)}`;
  }
  if (cleaned.startsWith("8210") && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  // US numbers: 10 digits
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;

  return null;
}

/**
 * Parses an Excel or CSV buffer into a list of contacts.
 * Supported column names (case-insensitive):
 *   phone / 전화번호 / number
 *   name / 이름
 *   message / 메시지 (optional)
 *   language / 언어 (optional)
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

  rows.forEach((row, index) => {
    const rowNum = index + 2; // 1-indexed, row 1 is header
    const get = (aliases: string[]) => {
      for (const alias of aliases) {
        const match = Object.keys(row).find((k) => normalize(k) === alias);
        if (match) return String(row[match]).trim();
      }
      return "";
    };

    const rawPhone = get(["phone", "전화번호", "number", "휴대폰"]);
    const name = get(["name", "이름", "성함"]) || "Unknown";
    const message = get(["message", "메시지", "msg"]);
    const language = get(["language", "언어", "lang"]);

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
