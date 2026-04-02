import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addToBlacklist } from "@/lib/compliance";
import { isOptOutKeyword, isHelpKeyword } from "@/lib/personalize";
import { sendSms } from "@/lib/twilio";

/**
 * Handles both:
 * 1. Twilio delivery status callbacks (MessageStatus webhook)
 * 2. Inbound SMS messages (when someone replies to a Twilio number)
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  const messageSid = params["MessageSid"];
  const messageStatus = params["MessageStatus"];
  const from = params["From"];
  const to = params["To"];
  const body = params["Body"] ?? "";

  // ── Delivery Status Callback ──────────────────────────────────────────────
  if (messageSid && messageStatus && !from) {
    const statusMap: Record<string, string> = {
      delivered: "DELIVERED",
      failed: "FAILED",
      undelivered: "UNDELIVERED",
      sent: "SENT",
    };

    const mapped = statusMap[messageStatus.toLowerCase()];
    if (mapped) {
      const record = await db.messageRecord.findFirst({
        where: { twilioSid: messageSid },
      });

      if (record) {
        await db.messageRecord.update({
          where: { id: record.id },
          data: {
            status: mapped as "DELIVERED" | "FAILED" | "UNDELIVERED" | "SENT",
            deliveredAt: mapped === "DELIVERED" ? new Date() : undefined,
            failedAt: mapped === "FAILED" || mapped === "UNDELIVERED" ? new Date() : undefined,
          },
        });

        if (mapped === "DELIVERED") {
          await db.campaign.update({
            where: { id: record.campaignId },
            data: { deliveredCount: { increment: 1 } },
          });
        }
      }
    }

    return new NextResponse("<?xml version='1.0' encoding='UTF-8'?><Response/>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // ── Inbound SMS ───────────────────────────────────────────────────────────
  if (from && to && messageSid) {
    const phoneNumber = await db.phoneNumber.findFirst({
      where: { number: to },
    });

    // Save inbound message
    await db.inboundMessage.upsert({
      where: { twilioSid: messageSid },
      update: {},
      create: {
        twilioSid: messageSid,
        from,
        to,
        body,
        phoneNumberId: phoneNumber?.id ?? null,
      },
    });

    // Handle opt-out keywords (TCPA compliance)
    if (isOptOutKeyword(body)) {
      await addToBlacklist(from, "STOP_REPLY");

      // Forward to real phone if configured
      if (phoneNumber?.forwardingNumber) {
        await sendSms(
          phoneNumber.forwardingNumber,
          to,
          `STOP received from ${from}: "${body}"`
        ).catch(() => {});
      }

      return new NextResponse(
        `<?xml version='1.0' encoding='UTF-8'?>
<Response>
  <Message>You have been unsubscribed and will no longer receive messages from us. Reply HELP for help.</Message>
</Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Handle HELP keyword
    if (isHelpKeyword(body)) {
      return new NextResponse(
        `<?xml version='1.0' encoding='UTF-8'?>
<Response>
  <Message>DavidJuice SMS Platform. To stop receiving messages reply STOP. For support contact us at your-support-email@example.com. Msg &amp; data rates may apply.</Message>
</Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Forward other replies to configured forwarding number
    if (phoneNumber?.forwardingNumber) {
      await sendSms(
        phoneNumber.forwardingNumber,
        to,
        `Reply from ${from}: "${body}"`
      ).catch(() => {});
    }

    return new NextResponse("<?xml version='1.0' encoding='UTF-8'?><Response/>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  return NextResponse.json({ ok: true });
}
