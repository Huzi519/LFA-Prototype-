import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Polling endpoint behind ChatThread's ~3s interval — the "real-time" feel
// for this prototype's chat, without adding a websocket/SSE dependency.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: { company: true, worker: true },
  });
  if (!conversation) return new NextResponse("Not found", { status: 404 });

  const isParticipant =
    conversation.company.userId === user.id || conversation.worker.userId === user.id;
  if (!isParticipant) return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const after = url.searchParams.get("after");

  const messages = await db.message.findMany({
    where: {
      conversationId: id,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      kind: m.kind,
      body: m.body,
      proposalTitle: m.proposalTitle,
      proposalDescription: m.proposalDescription,
      proposalBudget: m.proposalBudget,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
