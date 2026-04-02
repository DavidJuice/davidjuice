import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const campaign = await db.campaign.findFirst({
    where: { id, createdById: session.user.id },
    include: {
      phoneNumber: true,
      contactGroup: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ campaign });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const campaign = await db.campaign.updateMany({
    where: { id, createdById: session.user.id, status: { in: ["DRAFT", "SCHEDULED"] } },
    data: body,
  });

  return NextResponse.json({ updated: campaign.count });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db.campaign.deleteMany({
    where: { id, createdById: session.user.id, status: { in: ["DRAFT", "SCHEDULED"] } },
  });

  return NextResponse.json({ ok: true });
}
