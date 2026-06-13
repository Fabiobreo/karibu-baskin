import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import {
  buildRostersSnapshot,
  recomputeRatings,
  type RegistrationRefMap,
} from "@/lib/rating/ratingEngine";

const MatchResultSchema = z.object({
  matchup: z.enum(["AB", "AC", "BC"]).optional(),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  scoreC: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const results = await prisma.trainingMatchResult.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(results);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authSession = await auth();
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { sessionId } = await params;

  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { id: true, teams: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Allenamento non trovato" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = MatchResultSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  // Congela il roster delle due squadre coinvolte (fonte di verità per il
  // TrueSkill): risolve gli atleti a userId/childId via le iscrizioni correnti.
  const snapshot = await buildSnapshotForSession(sessionId, session.teams, parsed.data.matchup);

  // Crea il risultato e ricalcola i rating in un'unica transazione.
  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.trainingMatchResult.create({
      data: {
        sessionId,
        matchup: parsed.data.matchup ?? null,
        scoreA: parsed.data.scoreA,
        scoreB: parsed.data.scoreB,
        scoreC: parsed.data.scoreC ?? null,
        notes: parsed.data.notes?.trim() || null,
        rostersSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
    await recomputeRatings(tx);
    return created;
  });

  if (authSession?.user?.id) {
    logAudit({
      actorId: authSession.user.id,
      action: "CREATE_TRAINING_MATCH_RESULT",
      targetType: "TrainingSession",
      targetId: sessionId,
      after: {
        matchup: result.matchup,
        scoreA: result.scoreA,
        scoreB: result.scoreB,
        scoreC: result.scoreC,
      },
    }).catch((err) => console.error("[audit] training match result", err));
  }

  return NextResponse.json(result, { status: 201 });
}

/**
 * Costruisce lo snapshot dei roster delle due squadre coinvolte nel matchup,
 * risolvendo gli atleti (Registration.id nel JSON `teams`) a userId/childId.
 * Esportato implicitamente solo per uso interno alla route.
 */
async function buildSnapshotForSession(
  sessionId: string,
  teamsJson: unknown,
  matchup: string | null | undefined
) {
  const registrations = await prisma.registration.findMany({
    where: { sessionId },
    select: { id: true, userId: true, childId: true },
  });
  const refs: RegistrationRefMap = new Map(
    registrations.map((r) => [r.id, { userId: r.userId, childId: r.childId }])
  );
  const teams = (teamsJson ?? {}) as { teamA?: { id: string; name: string }[] };
  return buildRostersSnapshot(teams, matchup, refs);
}
