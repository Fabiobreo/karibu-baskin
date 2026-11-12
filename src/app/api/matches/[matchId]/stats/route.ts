import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser, isMember } from "@/lib/apiAuth";
import { publicSubjects } from "@/lib/minors";
import { PlayerStatsBatchSchema, computePoints } from "@/lib/schemas";
import { notifyMatchStats } from "@/lib/notifications/statsNotify";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { buildLoanLookup, isLoanParticipation } from "@/lib/rating/loanDetection";
import { reconcilePlayerBadges } from "@/lib/rating/badgeService";
import { inBackground } from "@/lib/background";
import { isHistoricMatch } from "@/lib/matches/matchPhase";

type Params = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;

  const stats = await prisma.playerMatchStats.findMany({
    where: { matchId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          sportRole: true,
          sportRoleVariant: true,
          birthDate: true,
        },
      },
      child: {
        select: { id: true, name: true, sportRole: true, sportRoleVariant: true, birthDate: true },
      },
    },
  });
  // Tutela dei minori: chi non è tesserato non li vede, e birthDate non esce
  // mai (serve solo a decidere). Vedi publicSubjects in @/lib/minors.
  return NextResponse.json(publicSubjects(stats, await isMember()));
}

// Upsert batch: riceve array di stats per la partita
export async function PUT(req: Request, { params }: Params) {
  const authSession = await auth();
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = PlayerStatsBatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati statistiche non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // Carica una volta sola i membri della squadra che disputa la partita per
  // quella stagione → permette di marcare ogni stat come prestito o meno.
  const loanLookup = await buildLoanLookup(matchId);
  if (!loanLookup) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }
  // Partita di oltre un mese fa: si sta inserendo lo storico, nessuno va avvisato.
  const notify = !isHistoricMatch(loanLookup.match.date, Date.now());

  // Chi aveva già una riga: correggere le statistiche non avvisa di nuovo
  // (UX-58), salvo un traguardo nuovo.
  const existingRows = await prisma.playerMatchStats.findMany({
    where: { matchId },
    select: { userId: true, childId: true },
  });
  const hadRow = (s: { userId?: string | null; childId?: string | null }) =>
    existingRows.some(
      (r) => (s.userId && r.userId === s.userId) || (s.childId && r.childId === s.childId)
    );

  // Upsert ogni riga
  const results = await Promise.all(
    body.map((s) => {
      const twoPointers = s.twoPointers ?? 0;
      const threePointers = s.threePointers ?? 0;
      const freeThrows = s.freeThrows ?? 0;
      const isLoan = isLoanParticipation(loanLookup, {
        userId: s.userId,
        childId: s.childId,
      });
      const data = {
        twoPointers,
        threePointers,
        freeThrows,
        points: computePoints({ twoPointers, threePointers, freeThrows }),
        fouls: s.fouls ?? 0,
        illegalFouls: s.illegalFouls ?? 0,
        shotsAttempted: s.shotsAttempted ?? 0,
        notes: s.notes?.trim() || null,
        isLoan,
      };
      if (s.userId) {
        return prisma.playerMatchStats.upsert({
          where: { matchId_userId: { matchId, userId: s.userId } },
          create: { matchId, userId: s.userId, ...data },
          update: data,
        });
      }
      if (s.childId) {
        return prisma.playerMatchStats.upsert({
          where: { matchId_childId: { matchId, childId: s.childId } },
          create: { matchId, childId: s.childId, ...data },
          update: data,
        });
      }
      return null;
    })
  );

  const saved = results.filter(Boolean);

  if (authSession?.user?.id && saved.length > 0) {
    inBackground(
      logAudit({
        actorId: authSession.user.id,
        action: "UPDATE_MATCH_STATS",
        targetType: "Match",
        targetId: matchId,
        after: { rowCount: saved.length },
      }),
      "audit update match stats"
    );
  }

  // Dopo la risposta: badge e un avviso solo per persona (UX-58). I traguardi
  // sbloccati da questo salvataggio non partono con un avviso loro: entrano
  // in quello delle statistiche ("6 punti e un traguardo nuovo").
  if (saved.length > 0) {
    inBackground(
      afterStatsSaved(matchId, body, { notify, hadRow }),
      notify ? "badges and notification match stats" : "badges match stats"
    );
  }

  return NextResponse.json(saved);
}

async function afterStatsSaved(
  matchId: string,
  rows: { userId?: string | null; childId?: string | null; points?: number | null }[],
  opts: {
    notify: boolean;
    hadRow: (s: { userId?: string | null; childId?: string | null }) => boolean;
  }
): Promise<void> {
  const players = await Promise.all(
    rows.map(async (s) => {
      const ref = s.userId
        ? ({ userId: s.userId } as const)
        : s.childId
          ? ({ childId: s.childId } as const)
          : null;
      if (!ref) return null;
      const badgeIds = await reconcilePlayerBadges(ref, { notify: false }).catch((err) => {
        console.error("[badges match stats]", err);
        return [] as string[];
      });
      return { ...s, badgeIds };
    })
  );
  if (!opts.notify) return;

  // Solo chi entra per la prima volta nelle statistiche o sblocca un traguardo:
  // agli altri la partita è già arrivata con il risultato.
  const toNotify = players
    .filter((p) => p !== null)
    .filter((p) => !opts.hadRow(p) || p.badgeIds.length > 0);
  if (toNotify.length === 0) return;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      slug: true,
      opponent: { select: { name: true } },
      opponentTeam: { select: { name: true } },
    },
  });
  if (!match) return;
  const savedPoints = await prisma.playerMatchStats.findMany({
    where: { matchId },
    select: { userId: true, childId: true, points: true },
  });
  await notifyMatchStats(
    toNotify.map((p) => ({
      userId: p.userId,
      childId: p.childId,
      badgeIds: p.badgeIds,
      points:
        savedPoints.find(
          (r) => (p.userId && r.userId === p.userId) || (p.childId && r.childId === p.childId)
        )?.points ?? 0,
    })),
    {
      opponentName: match.opponent?.name ?? match.opponentTeam?.name ?? "Avversario",
      // Ancora sulla sezione "Per te" della pagina partita.
      url: `/partite/${match.slug ?? matchId}#per-te`,
    }
  );
}
