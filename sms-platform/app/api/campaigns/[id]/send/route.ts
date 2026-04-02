import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enqueueCampaign, scheduleCampaign } from "@/lib/queue";

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

  if (campaign.status === "SENDING" || campaign.status === "QUEUED") {
    return NextResponse.json({ error: "Campaign is already sending" }, { status: 409 });
  }

  if (campaign.status === "COMPLETED") {
    return NextResponse.json({ error: "Campaign already completed" }, { status: 409 });
  }

  let jobId: string;

  if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
    jobId = await scheduleCampaign(id, campaign.scheduledAt);
    await db.campaign.update({
      where: { id },
      data: { status: "SCHEDULED", bullJobId: jobId },
    });
  } else {
    jobId = await enqueueCampaign(id);
    await db.campaign.update({
      where: { id },
      data: { status: "QUEUED", bullJobId: jobId },
    });
  }

  return NextResponse.json({ jobId });
}
