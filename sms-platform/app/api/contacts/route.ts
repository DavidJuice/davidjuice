import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const where = groupId
    ? {
        ownerId: session.user.id,
        groupMembers: { some: { groupId } },
      }
    : { ownerId: session.user.id };

  const [contacts, total] = await Promise.all([
    db.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.contact.count({ where }),
  ]);

  return NextResponse.json({ contacts, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { phone, name, customMessage, language } = body;

  if (!phone || !name) {
    return NextResponse.json({ error: "Phone and name are required" }, { status: 400 });
  }

  const contact = await db.contact.upsert({
    where: { ownerId_phone: { ownerId: session.user.id, phone } },
    update: { name, customMessage, language },
    create: {
      ownerId: session.user.id,
      phone,
      name,
      customMessage,
      language,
      consentSource: "manual",
      consentAt: new Date(),
    },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
