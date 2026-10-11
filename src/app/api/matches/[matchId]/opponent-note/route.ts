import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { MatchOpponentNoteSchema } from "@/lib/schemas";
import { hasStarted } from "@/lib/matches/matchPhase";
import { noteAuditSummary } from "@/lib/matches/opponentSheet";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { inBackground } from "@/lib/background";

type Params = { params: Promise<{ matchId: string }> };

/**
 * Nota dello staff sull'avversaria in una partita giocata: il diario della
 * scheda dell'avversaria. La scrive anche l'allenatore (come la scheda), per
 * questo non passa dalla PUT della partita, che è dell'admin.
 */
export async function PUT(req: Request, { params }: Params) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = MatchOpponentNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const note = parsed.data.note?.trim() ?? "";

  const { matchId } = await params;
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { opponentId: true, date: true, opponentNote: { select: { note: true } } },
    });
    if (!match) {
      return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
    }
    if (!match.opponentId) {
      return NextResponse.json(
        { error: "La nota si scrive solo per le partite contro un'avversaria in anagrafica" },
        { status: 400 }
      );
    }
    if (!hasStarted(match.date, Date.now())) {
      return NextResponse.json(
        { error: "La partita non è ancora iniziata: prima di giocare si compila la scheda" },
        { status: 409 }
      );
    }

    const previous = match.opponentNote?.note ?? null;
    let saved: { note: string | null } = { note: null };
    if (note) {
      saved = await prisma.matchOpponentNote.upsert({
        where: { matchId },
        create: { matchId, note },
        update: { note },
        select: { note: true },
      });
    } else {
      await prisma.matchOpponentNote.deleteMany({ where: { matchId } });
    }

    // Nel registro resta chi ha scritto, tolto o cambiato la nota, non il testo.
    if (authSession?.user?.id && saved.note !== previous) {
      inBackground(
        logAudit({
          actorId: authSession.user.id,
          action: "UPDATE_OPPONENT_NOTE",
          targetType: "Match",
          targetId: matchId,
          before: noteAuditSummary(previous),
          after: noteAuditSummary(saved.note),
        }),
        "audit update opponent note"
      );
    }
    return NextResponse.json(saved);
  } catch (err) {
    // Partita eliminata fra la lettura e il salvataggio.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
    }
    console.error("[matches] opponent note", err);
    return NextResponse.json({ error: "Errore nel salvataggio della nota" }, { status: 500 });
  }
}
