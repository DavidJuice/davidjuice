import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enqueueCampaign } from "@/lib/queue";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const campaign = await db.campaign.findFirst({
    where: { id, createdById: session.user.id },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Reset failed message records to PENDING so worker retries them
  await db.messageRecord.updateMany({
    where: { campaignId: id, status: { in: ["FAILED", "UNDELIVERED"] } },
    data: {
      status: "PENDING",
      errorCode: null,
      errorMessage: null,
      failedAt: null,
    },
  });

  // Reset campaign counts
  const failedCount = await db.messageRecord.count({
    where: { campaignId: id, status: "PENDING" },
  });

  const jobId = await enqueueCampaign(id);

  await db.campaign.update({
    where: { id },
    data: {
      status: "QUEUED",
      bullJobId: jobId,
      failedCount: 0,
    },
  });

  return NextResponse.json({ jobId, retriedCount: failedCount });
}
