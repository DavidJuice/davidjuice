import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      let done = false;

      while (!done) {
        const campaign = await db.campaign.findFirst({
          where: { id, createdById: session.user.id },
          select: {
            status: true,
            sentCount: true,
            failedCount: true,
            deliveredCount: true,
            totalContacts: true,
          },
        });

        if (!campaign) {
          send({ error: "Campaign not found" });
          break;
        }

        send({
          status: campaign.status,
          sent: campaign.sentCount,
          delivered: campaign.deliveredCount,
          failed: campaign.failedCount,
          total: campaign.totalContacts,
        });

        if (
          campaign.status === "COMPLETED" ||
          campaign.status === "FAILED" ||
          campaign.status === "PAUSED" ||
          campaign.status === "CANCELLED"
        ) {
          done = true;
          break;
        }

        // Poll every 1.5 seconds
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
