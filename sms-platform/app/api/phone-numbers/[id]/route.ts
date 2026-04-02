import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { forwardingNumber, friendlyName, assignedToId } = await req.json();

  const phoneNumber = await db.phoneNumber.update({
    where: { id },
    data: {
      forwardingNumber: forwardingNumber ?? undefined,
      friendlyName: friendlyName ?? undefined,
      assignedToId: assignedToId ?? undefined,
    },
  });

  return NextResponse.json({ phoneNumber });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;

  await db.phoneNumber.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
