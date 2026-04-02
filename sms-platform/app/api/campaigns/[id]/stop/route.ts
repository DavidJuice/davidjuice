import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stopCampaignJob } from "@/lib/queue";

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

  if (campaign.bullJobId) {
    await stopCampaignJob(campaign.bullJobId);
  }

  await db.campaign.update({
    where: { id },
    data: { status: "PAUSED" },
  });

  return NextResponse.json({ ok: true, status: "PAUSED" });
}
