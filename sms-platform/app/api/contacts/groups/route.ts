import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await db.contactGroup.findMany({
    where: { ownerId: session.user.id },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const group = await db.contactGroup.create({
    data: { name, description, ownerId: session.user.id },
  });

  return NextResponse.json({ group }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await db.contactGroup.deleteMany({
    where: { id, ownerId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
