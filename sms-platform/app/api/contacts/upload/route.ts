import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseContactsFile } from "@/lib/excel";
import { isBlacklisted } from "@/lib/compliance";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const groupName = formData.get("groupName") as string | null;
  const confirm = formData.get("confirm") === "true";

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { contacts, hasCustomMessages, errors } = parseContactsFile(buffer);

  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "No valid contacts found", errors },
      { status: 400 }
    );
  }

  // Preview mode: return first 10 rows for confirmation
  if (!confirm) {
    return NextResponse.json({
      preview: contacts.slice(0, 10),
      total: contacts.length,
      hasCustomMessages,
      errors,
    });
  }

  // Confirmed — save to DB
  const name = groupName ?? `Upload ${new Date().toLocaleDateString()}`;

  const group = await db.contactGroup.create({
    data: { name, ownerId: session.user.id },
  });

  let imported = 0;
  let skipped = 0;

  for (const c of contacts) {
    if (await isBlacklisted(c.phone)) {
      skipped++;
      continue;
    }

    const contact = await db.contact.upsert({
      where: { ownerId_phone: { ownerId: session.user.id, phone: c.phone } },
      update: { name: c.name, customMessage: c.message ?? null, language: c.language ?? null },
      create: {
        ownerId: session.user.id,
        phone: c.phone,
        name: c.name,
        customMessage: c.message ?? null,
        language: c.language ?? null,
        consentSource: "uploaded",
        consentAt: new Date(),
      },
    });

    await db.contactGroupMember.upsert({
      where: { contactId_groupId: { contactId: contact.id, groupId: group.id } },
      update: { customMessage: c.message ?? null },
      create: {
        contactId: contact.id,
        groupId: group.id,
        customMessage: c.message ?? null,
      },
    });

    imported++;
  }

  await db.contactGroup.update({
    where: { id: group.id },
    data: {},
  });

  return NextResponse.json({
    group,
    imported,
    skipped,
    errors,
    hasCustomMessages,
  });
}
