import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const numbers = await db.phoneNumber.findMany({
    where: { isActive: true },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ numbers });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can add phone numbers
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { number, twilioSid, friendlyName, forwardingNumber } = await req.json();

  if (!number || !twilioSid) {
    return NextResponse.json(
      { error: "number and twilioSid are required" },
      { status: 400 }
    );
  }

  const phoneNumber = await db.phoneNumber.create({
    data: {
      number,
      twilioSid,
      friendlyName,
      forwardingNumber: forwardingNumber ?? null,
      assignedToId: session.user.id,
    },
  });

  return NextResponse.json({ phoneNumber }, { status: 201 });
}
