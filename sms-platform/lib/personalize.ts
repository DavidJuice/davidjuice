/**
 * Replaces {name}, {phone} tokens in a message template with contact data.
 */
export function personalizeMessage(
  template: string,
  contact: { name: string; phone: string }
): string {
  return template
    .replace(/\{name\}/gi, contact.name)
    .replace(/\{phone\}/gi, contact.phone);
}

export const OPT_OUT_KEYWORDS = [
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
];
export const HELP_KEYWORDS = ["HELP", "INFO"];

export function isOptOutKeyword(body: string): boolean {
  const normalized = body.trim().toUpperCase();
  return OPT_OUT_KEYWORDS.includes(normalized);
}

export function isHelpKeyword(body: string): boolean {
  const normalized = body.trim().toUpperCase();
  return HELP_KEYWORDS.includes(normalized);
}
