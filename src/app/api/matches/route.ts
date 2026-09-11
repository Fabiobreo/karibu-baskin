import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { MatchCreateSchema, deriveResult } from "@/lib/schemas";
import { generateMatchSlug } from "@/lib/slugUtils";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import type { MatchResult } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { logAudit } from "@/lib/audit";
import { mixedMatchError } from "@/lib/matches/mixedTeam";

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getClientIp(req), "get-matches", 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const { searchParams } = req.nextUrl;
  const teamId = searchParams.get("teamId");

  // La scheda dello staff sull'avversario (valutazioni e note) non esce dalle
  // GET: il pannello admin la legge lato server.
  const matches = await prisma.match.findMany({
    where: teamId ? { OR: [{ teamId }, { opponentTeamId: teamId }] } : undefined,
    orderBy: { date: "desc" },
    omit: { opponentProfile: true },
    include: {
      team: { select: { id: true, name: true, season: true, color: true } },
      opponent: { select: { id: true, name: true, city: true } },
      opponentTeam: { select: { id: true, name: true, season: true, color: true } },
      group: { select: { id: true, name: true } },
      _count: { select: { playerStats: true } },
    },
  });
  return NextResponse.json(matches);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = MatchCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // Auto-derive result from scores; reject contradictions
  let resolvedResult: MatchResult | null = body.result ?? null;
  if (
    body.ourScore !== undefined &&
    body.ourScore !== null &&
    body.theirScore !== undefined &&
    body.theirScore !== null
  ) {
    const derived = deriveResult(body.ourScore, body.theirScore);
    if (resolvedResult !== null && resolvedResult !== derived) {
      return NextResponse.json(
        {
          error: `Il risultato ${resolvedResult} non corrisponde al punteggio (${body.ourScore}–${body.theirScore} → ${derived})`,
        },
        { status: 400 }
      );
    }
    resolvedResult = derived;
  }

  const matchDate = new Date(body.date);

  // Fetch nomi per la generazione dello slug (sia avversario esterno che interno)
  const [team, opponentExt, opponentInt] = await Promise.all([
    prisma.competitiveTeam.findUnique({
      where: { id: body.teamId },
      select: { name: true, isMixed: true },
    }),
    body.opponentId
      ? prisma.opposingTeam.findUnique({
          where: { id: body.opponentId },
          select: { name: true },
        })
      : Promise.resolve(null),
    body.opponentTeamId
      ? prisma.competitiveTeam.findUnique({
          where: { id: body.opponentTeamId },
          select: { name: true, isMixed: true },
        })
      : Promise.resolve(null),
  ]);
  if (!team) return NextResponse.json({ error: "Squadra non trovata" }, { status: 404 });

  // Le partite interne sono sempre amichevoli (lo schema lo richiede); una
  // Karibu di stagione senza tipo indicato gioca un'amichevole, mai il campionato.
  const involvesMixed = team.isMixed || !!opponentInt?.isMixed;
  const resolvedMatchType = body.opponentTeamId
    ? "FRIENDLY"
    : (body.matchType ?? (involvesMixed ? "FRIENDLY" : "LEAGUE"));
  const mixedError = mixedMatchError({
    involvesMixed,
    matchType: resolvedMatchType,
    groupId: body.groupId,
  });
  if (mixedError) return NextResponse.json({ error: mixedError }, { status: 400 });

  const opponentName = opponentExt?.name ?? opponentInt?.name ?? null;
  const slug = opponentName ? await generateMatchSlug(team.name, opponentName, matchDate) : null;

  const match = await prisma.match.create({
    data: {
      slug,
      teamId: body.teamId,
      opponentId: body.opponentId ?? null,
      opponentTeamId: body.opponentTeamId ?? null,
      date: matchDate,
      isHome: body.isHome ?? true,
      venue: body.venue?.trim() || null,
      matchType: resolvedMatchType,
      ourScore: body.ourScore ?? null,
      theirScore: body.theirScore ?? null,
      result: resolvedResult,
      notes: body.notes?.trim() || null,
      matchday: body.matchday ?? null,
      groupId: body.opponentTeamId ? null : (body.groupId ?? null),
    },
    include: {
      team: { select: { id: true, name: true, season: true, color: true, championship: true } },
      opponent: { select: { id: true, name: true, city: true } },
      opponentTeam: { select: { id: true, name: true, season: true, color: true } },
      group: { select: { id: true, name: true } },
      _count: { select: { playerStats: true } },
    },
  });
  if (session?.user?.id) {
    logAudit({
      actorId: session.user.id,
      action: "CREATE_MATCH",
      targetType: "Match",
      targetId: match.id,
      after: {
        teamId: body.teamId,
        opponentId: body.opponentId,
        opponentTeamId: body.opponentTeamId,
        date: body.date,
      },
    }).catch((err) => console.error("[audit] create match", err));
  }

  return NextResponse.json(match, { status: 201 });
}
