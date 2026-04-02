/**
 * Compliance helpers for US (TCPA/CAN-SPAM) and Washington State (RCW 80.36.400).
 */
import { db } from "./db";

/**
 * Returns true if the phone number is on the blacklist (opted out).
 */
export async function isBlacklisted(phone: string): Promise<boolean> {
  const entry = await db.blacklist.findUnique({ where: { phone } });
  return !!entry;
}

/**
 * Adds a phone to the blacklist and records an audit log entry.
 * reason: "STOP_REPLY" | "MANUAL" | "DNC"
 */
export async function addToBlacklist(
  phone: string,
  reason: string,
  userId?: string
): Promise<void> {
  await db.blacklist.upsert({
    where: { phone },
    update: { reason },
    create: { phone, reason },
  });
  await db.auditLog.create({
    data: {
      userId: userId ?? null,
      action: "BLACKLIST_ADD",
      target: phone,
      metadata: { reason },
    },
  });
}

/**
 * Washington State RCW 80.36.400:
 * No automated messages between 9 PM and 8 AM Pacific time.
 */
export function isWithinAllowedSendingHours(): boolean {
  // Get current time in US/Pacific
  const now = new Date();
  const pacificTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    hour12: false,
  }).format(now);
  const hour = parseInt(pacificTime, 10);
  // Allow 8:00 AM (8) through 8:59 PM (20); block 21:00–7:59
  return hour >= 8 && hour < 21;
}

/**
 * Builds the opt-out footer to append to messages (TCPA compliance).
 */
export function buildOptOutFooter(businessName?: string): string {
  const name = businessName ?? "DavidJuice";
  return `\n\nMsg from ${name}. Reply STOP to unsubscribe. Reply HELP for help.`;
}
