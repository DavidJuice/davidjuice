/**
 * BullMQ worker that processes SMS campaign jobs sequentially.
 * Run with: npx ts-node jobs/sms-worker.ts
 * Or use a process manager like PM2 in production.
 */
import { Worker, Job } from "bullmq";
import { db } from "../lib/db";
import { sendSms } from "../lib/twilio";
import { personalizeMessage } from "../lib/personalize";
import { isBlacklisted, isWithinAllowedSendingHours, buildOptOutFooter } from "../lib/compliance";
import { connection, isStopped, CampaignJobData } from "../lib/queue";

const DELAY_MS = 200; // ~5 msgs/sec — respectful rate

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const worker = new Worker<CampaignJobData>(
  "sms-campaigns",
  async (job: Job<CampaignJobData>) => {
    const { campaignId } = job.data;

    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: {
        phoneNumber: true,
        contactGroup: {
          include: {
            members: {
              include: { contact: true },
            },
          },
        },
      },
    });

    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
    if (!campaign.contactGroup) throw new Error("Campaign has no contact group");

    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "SENDING", startedAt: new Date() },
    });

    const members = campaign.contactGroup.members;
    const fromNumber = campaign.phoneNumber.number;
    const bullJobId = job.id!;

    for (let i = 0; i < members.length; i++) {
      // Check if job was stopped
      if (await isStopped(bullJobId)) {
        await db.campaign.update({
          where: { id: campaignId },
          data: { status: "PAUSED" },
        });
        return;
      }

      // Washington State time-of-day check
      if (!isWithinAllowedSendingHours()) {
        await db.campaign.update({
          where: { id: campaignId },
          data: { status: "PAUSED" },
        });
        throw new Error(
          "Send halted: outside allowed sending hours (8 AM – 9 PM Pacific per WA RCW 80.36.400)"
        );
      }

      const member = members[i];
      const contact = member.contact;

      // Check blacklist before each send
      if (await isBlacklisted(contact.phone)) {
        await db.messageRecord.updateMany({
          where: { campaignId, contactId: contact.id },
          data: { status: "FAILED", errorMessage: "Blacklisted", failedAt: new Date() },
        });
        await db.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
        continue;
      }

      // Build final message
      const baseMessage =
        member.customMessage ||
        contact.customMessage ||
        campaign.message ||
        "";

      let finalMessage = personalizeMessage(baseMessage, {
        name: contact.name,
        phone: contact.phone,
      });

      if (campaign.includeOptOut) {
        finalMessage += campaign.optOutFooter ?? buildOptOutFooter();
      }

      // Find or create message record
      let record = await db.messageRecord.findFirst({
        where: { campaignId, contactId: contact.id },
      });

      if (!record) {
        record = await db.messageRecord.create({
          data: {
            campaignId,
            contactId: contact.id,
            phone: contact.phone,
            message: finalMessage,
            status: "QUEUED",
          },
        });
      }

      try {
        const twilioMsg = await sendSms(contact.phone, fromNumber, finalMessage);
        await db.messageRecord.update({
          where: { id: record.id },
          data: {
            status: "SENT",
            twilioSid: twilioMsg.sid,
            sentAt: new Date(),
          },
        });
        await db.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        });
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        await db.messageRecord.update({
          where: { id: record.id },
          data: {
            status: "FAILED",
            errorCode: String(error.code ?? "UNKNOWN"),
            errorMessage: error.message ?? "Unknown error",
            failedAt: new Date(),
          },
        });
        await db.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }

      await sleep(DELAY_MS);
    }

    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  },
  {
    connection,
    concurrency: 1, // Sequential processing
  }
);

worker.on("failed", async (job, err) => {
  if (job) {
    await db.campaign.update({
      where: { id: job.data.campaignId },
      data: { status: "FAILED" },
    });
  }
  console.error(`Campaign job failed:`, err);
});

worker.on("completed", (job) => {
  console.log(`Campaign ${job.data.campaignId} completed`);
});

console.log("SMS Worker started, waiting for jobs...");
