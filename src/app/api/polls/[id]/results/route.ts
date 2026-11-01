import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { panelGuard } from "@/lib/apiAuth";
import { summarizePoll } from "@/lib/polls/pollResults";

type Params = { params: Promise<{ id: string }> };

// GET /api/polls/[id]/results
// Risultati di un sondaggio con i nomi di chi ha votato: staff e dirigenti.
export async function GET(_req: Request, { params }: Params) {
  const denied = await panelGuard();
  if (denied) return denied;

  const { id } = await params;
  const poll = await prisma.poll.findUnique({
    where: { id },
    select: {
      question: true,
      multiSelect: true,
      closesAt: true,
      options: { select: { id: true, text: true, order: true } },
      votes: { select: { optionId: true, userId: true, user: { select: { name: true } } } },
    },
  });
  if (!poll) return NextResponse.json({ error: "Sondaggio non trovato" }, { status: 404 });

  return NextResponse.json(summarizePoll(poll));
}
