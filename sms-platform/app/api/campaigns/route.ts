import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await db.campaign.findMany({
    where: { createdById: session.user.id },
    include: {
      phoneNumber: { select: { number: true, friendlyName: true } },
      contactGroup: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name,
    message,
    phoneNumberId,
    contactGroupId,
    templateId,
    includeOptOut,
    optOutFooter,
    scheduledAt,
  } = body;

  if (!name || !phoneNumberId || !contactGroupId) {
    return NextResponse.json(
      { error: "name, phoneNumberId, and contactGroupId are required" },
      { status: 400 }
    );
  }

  // Count contacts in group for totalContacts
  const memberCount = await db.contactGroupMember.count({
    where: { groupId: contactGroupId },
  });

  const campaign = await db.campaign.create({
    data: {
      name,
      message: message ?? null,
      phoneNumberId,
      contactGroupId,
      templateId: templateId ?? null,
      includeOptOut: includeOptOut ?? true,
      optOutFooter: optOutFooter ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? "SCHEDULED" : "DRAFT",
      totalContacts: memberCount,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
