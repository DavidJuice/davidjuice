import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const [messages, total, unreadCount] = await Promise.all([
    db.inboundMessage.findMany({
      where: unreadOnly ? { isRead: false } : {},
      include: {
        phoneNumber: { select: { number: true, friendlyName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.inboundMessage.count(),
    db.inboundMessage.count({ where: { isRead: false } }),
  ]);

  return NextResponse.json({ messages, total, unreadCount, page, limit });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, isRead } = await req.json();

  await db.inboundMessage.update({
    where: { id },
    data: { isRead },
  });

  return NextResponse.json({ ok: true });
}
