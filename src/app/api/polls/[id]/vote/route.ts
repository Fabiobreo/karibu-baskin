import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { PollVoteSchema } from "@/lib/schemas/post";

type Params = { params: Promise<{ id: string }> };

// POST — vota (o modifica il proprio voto) su un poll
export async function POST(req: NextRequest, { params }: Params) {
  const rl = checkRateLimit(getClientIp(req), "poll-vote", 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Devi essere loggato per votare" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id: pollId } = await params;

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: { select: { id: true } } },
  });
  if (!poll) return NextResponse.json({ error: "Sondaggio non trovato" }, { status: 404 });

  const now = new Date();
  if (poll.closesAt && poll.closesAt <= now) {
    return NextResponse.json({ error: "Il sondaggio è chiuso" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = PollVoteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const { optionIds } = parsed.data;

  // Verifica che tutte le opzioni appartengano a questo poll
  const validIds = new Set(poll.options.map((o) => o.id));
  const invalid = optionIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    return NextResponse.json({ error: "Opzione non valida" }, { status: 400 });
  }

  // Se single-select, accetta solo 1 opzione
  if (!poll.multiSelect && optionIds.length > 1) {
    return NextResponse.json({ error: "Puoi scegliere solo un'opzione" }, { status: 400 });
  }

  // Sostituisce i voti dell'utente in una transazione atomica
  await prisma.$transaction([
    prisma.pollVote.deleteMany({ where: { pollId, userId } }),
    prisma.pollVote.createMany({
      data: optionIds.map((optionId) => ({ pollId, optionId, userId })),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
