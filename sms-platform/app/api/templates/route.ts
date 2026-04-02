import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await db.messageTemplate.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, body } = await req.json();
  if (!name || !body) {
    return NextResponse.json({ error: "name and body are required" }, { status: 400 });
  }

  const template = await db.messageTemplate.create({
    data: { name, body, ownerId: session.user.id },
  });

  return NextResponse.json({ template }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, body } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const template = await db.messageTemplate.updateMany({
    where: { id, ownerId: session.user.id },
    data: { name, body },
  });

  return NextResponse.json({ updated: template.count });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();

  await db.messageTemplate.deleteMany({
    where: { id, ownerId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
