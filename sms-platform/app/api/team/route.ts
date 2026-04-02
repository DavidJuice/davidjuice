import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { campaigns: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { userId, role } = await req.json();
  if (!userId || !role) {
    return NextResponse.json({ error: "userId and role required" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await db.user.findUnique({ where: { id: session.user.id } });
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { userId } = await req.json();

  // Don't allow deleting yourself
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await db.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
