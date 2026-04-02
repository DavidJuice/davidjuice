import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addToBlacklist } from "@/lib/compliance";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await db.blacklist.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone, reason } = await req.json();
  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

  await addToBlacklist(phone, reason ?? "MANUAL", session.user.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can remove from blacklist
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { phone } = await req.json();

  await db.blacklist.deleteMany({ where: { phone } });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "BLACKLIST_REMOVE",
      target: phone,
    },
  });

  return NextResponse.json({ ok: true });
}
