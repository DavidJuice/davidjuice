import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const smsQueue = new Queue("sms-campaigns", { connection });
export const queueEvents = new QueueEvents("sms-campaigns", { connection });

export { connection };

export interface CampaignJobData {
  campaignId: string;
}

export async function enqueueCampaign(campaignId: string): Promise<string> {
  const job = await smsQueue.add(
    "send-campaign",
    { campaignId } satisfies CampaignJobData,
    {
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
    }
  );
  return job.id!;
}

export async function scheduleCampaign(
  campaignId: string,
  runAt: Date
): Promise<string> {
  const delay = Math.max(0, runAt.getTime() - Date.now());
  const job = await smsQueue.add(
    "send-campaign",
    { campaignId } satisfies CampaignJobData,
    {
      delay,
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
    }
  );
  return job.id!;
}

export async function stopCampaignJob(jobId: string): Promise<void> {
  const job = await smsQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
  // Also set a Redis stop flag that the worker checks
  await connection.set(`stop:${jobId}`, "1", "EX", 86400);
}

export async function isStopped(jobId: string): Promise<boolean> {
  const val = await connection.get(`stop:${jobId}`);
  return val === "1";
}
