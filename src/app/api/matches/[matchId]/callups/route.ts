import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { CallupsSchema } from "@/lib/schemas";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { buildLoanLookup, isLoanParticipation } from "@/lib/loanDetection";

type Params = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;

  const callups = await prisma.matchCallup.findMany({
    where: { matchId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          sportRole: true,
          sportRoleVariant: true,
          slug: true,
        },
      },
      child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
    },
  });
  // Normalizza teamId: per i record legacy (null) restituisci match.teamId
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { teamId: true },
  });
  const fallbackTeamId = match?.teamId ?? null;
  const normalized = callups.map((c) => ({ ...c, teamId: c.teamId ?? fallbackTeamId }));
  return NextResponse.json(normalized);
}

// PUT — sostituisce i convocati per la partita (batch)
// Body: { userIds: string[], childIds: string[] }
export async function PUT(req: Request, { params }: Params) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = CallupsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }
  const { teamId: requestedTeamId, userIds, childIds } = parsed.data;

  // Carica la partita per validare il teamId richiesto e calcolare il fallback.
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { teamId: true, opponentTeamId: true },
  });
  if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  // teamId effettivo: quello richiesto o, per backward-compat, match.teamId
  const effectiveTeamId = requestedTeamId ?? match.teamId;

  // Valida che il teamId richiesto sia uno dei due lati della partita
  if (
    requestedTeamId &&
    requestedTeamId !== match.teamId &&
    requestedTeamId !== match.opponentTeamId
  ) {
    return NextResponse.json(
      { error: "La squadra non partecipa a questa partita" },
      { status: 400 }
    );
  }

  // Verifica che la partita esista e carica i membri della squadra "lato"
  // selezionato per marcare ogni convocazione come prestito o meno.
  const loanLookup = await buildLoanLookup(matchId, effectiveTeamId);
  if (!loanLookup) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  // Non si possono convocare giocatori che hanno marcato "non disponibile".
  // Chi non ha risposto è considerato non disponibile (default).
  // Eccezione: i giocatori in prestito (non membri della squadra) possono essere
  // aggiunti dallo staff anche senza conferma di disponibilità (override).
  const checkUserIds = userIds.filter((id) => !isLoanParticipation(loanLookup, { userId: id }));
  const checkChildIds = childIds.filter((id) => !isLoanParticipation(loanLookup, { childId: id }));
  if (checkUserIds.length > 0 || checkChildIds.length > 0) {
    const availables = await prisma.matchAvailability.findMany({
      where: {
        matchId,
        available: true,
        OR: [
          checkUserIds.length > 0 ? { userId: { in: checkUserIds } } : null,
          checkChildIds.length > 0 ? { childId: { in: checkChildIds } } : null,
        ].filter((x): x is NonNullable<typeof x> => x !== null),
      },
      select: { userId: true, childId: true },
    });
    const availableUserIds = new Set(
      availables.map((a) => a.userId).filter((id): id is string => !!id)
    );
    const availableChildIds = new Set(
      availables.map((a) => a.childId).filter((id): id is string => !!id)
    );
    const blocked: string[] = [];
    for (const id of checkUserIds) if (!availableUserIds.has(id)) blocked.push(id);
    for (const id of checkChildIds) if (!availableChildIds.has(id)) blocked.push(id);
    if (blocked.length > 0) {
      return NextResponse.json(
        { error: "Non puoi convocare giocatori non disponibili" },
        { status: 400 }
      );
    }
  }

  // Cancella solo i callup per QUESTO lato. I record legacy (teamId NULL)
  // appartengono semanticamente a match.teamId, quindi vengono inclusi solo
  // quando si sta aggiornando match.teamId.
  const deleteWhere =
    effectiveTeamId === match.teamId
      ? {
          matchId,
          OR: [{ teamId: effectiveTeamId }, { teamId: null }],
        }
      : { matchId, teamId: effectiveTeamId };

  const before = await prisma.matchCallup.findMany({
    where: deleteWhere,
    select: { userId: true, childId: true },
  });

  // Sostituisci i convocati per il lato selezionato
  await prisma.$transaction([
    prisma.matchCallup.deleteMany({ where: deleteWhere }),
    prisma.matchCallup.createMany({
      data: [
        ...userIds.map((userId) => ({
          matchId,
          teamId: effectiveTeamId,
          userId,
          isLoan: isLoanParticipation(loanLookup, { userId }),
        })),
        ...childIds.map((childId) => ({
          matchId,
          teamId: effectiveTeamId,
          childId,
          isLoan: isLoanParticipation(loanLookup, { childId }),
        })),
      ],
      skipDuplicates: true,
    }),
  ]);

  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "UPDATE_CALLUPS",
      targetType: "Match",
      targetId: matchId,
      before: {
        teamId: effectiveTeamId,
        userIds: before.map((c) => c.userId).filter(Boolean),
        childIds: before.map((c) => c.childId).filter(Boolean),
      },
      after: { teamId: effectiveTeamId, userIds, childIds },
    }).catch((err) => console.error("[audit] update callups", err));
  }

  return NextResponse.json({ ok: true, total: userIds.length + childIds.length });
}
