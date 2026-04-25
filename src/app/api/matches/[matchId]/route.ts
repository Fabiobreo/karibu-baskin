import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { sendPushToAll } from "@/lib/webpush";
import { createAppNotification } from "@/lib/appNotifications";
import { MatchUpdateSchema } from "@/lib/schemas/match";
import { generateMatchSlug } from "@/lib/slugUtils";
import type { MatchResult } from "@prisma/client";

type Params = { params: Promise<{ matchId: string }> };

function deriveResult(ourScore: number, theirScore: number): MatchResult {
  if (ourScore > theirScore) return "WIN";
  if (ourScore < theirScore) return "LOSS";
  return "DRAW";
}

export async function GET(_req: Request, { params }: Params) {
  const { matchId } = await params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      team: { select: { id: true, name: true, season: true, color: true, championship: true } },
      opponent: { select: { id: true, name: true, city: true } },
      playerStats: {
        include: {
          user: { select: { id: true, name: true, image: true, sportRole: true, sportRoleVariant: true } },
          child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
        },
      },
    },
  });

  if (!match) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  return NextResponse.json(match);
}

export async function PUT(req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = MatchUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const body = parsed.data;

  // Leggi stato precedente per capire se il risultato è nuovo e se manca lo slug
  const previous = await prisma.match.findUnique({
    where: { id: matchId },
    select: { result: true, ourScore: true, theirScore: true, slug: true, teamId: true, opponentId: true, date: true },
  });

  // 2.3 — Auto-derive result from scores (takes precedence over explicit result field)
  const incomingOur = body.ourScore !== undefined ? body.ourScore : previous?.ourScore;
  const incomingTheir = body.theirScore !== undefined ? body.theirScore : previous?.theirScore;
  let resolvedResult = body.result !== undefined ? body.result : previous?.result ?? null;

  if (incomingOur !== null && incomingOur !== undefined && incomingTheir !== null && incomingTheir !== undefined) {
    const derived = deriveResult(incomingOur, incomingTheir);
    if (body.result !== undefined && body.result !== null && body.result !== derived) {
      return NextResponse.json(
        { error: `Il risultato ${body.result} non corrisponde al punteggio (${incomingOur}–${incomingTheir} → ${derived})` },
        { status: 400 }
      );
    }
    resolvedResult = derived;
  }

  // Genera slug se manca (backfill per partite create prima dell'introduzione dello slug)
  let slugToSet: string | null | undefined = undefined; // undefined = non aggiornare
  if (!previous?.slug) {
    const teamId     = body.opponentId ? (previous?.teamId ?? "") : (previous?.teamId ?? "");
    const opponentId = body.opponentId ?? previous?.opponentId ?? "";
    const matchDate  = body.date ? new Date(body.date) : (previous?.date ?? new Date());
    const [teamRec, oppRec] = await Promise.all([
      prisma.competitiveTeam.findUnique({ where: { id: teamId }, select: { name: true } }),
      prisma.opposingTeam.findUnique({ where: { id: opponentId }, select: { name: true } }),
    ]);
    if (teamRec && oppRec) {
      slugToSet = await generateMatchSlug(teamRec.name, oppRec.name, matchDate);
    }
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      ...(slugToSet !== undefined && { slug: slugToSet }),
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.isHome !== undefined && { isHome: body.isHome }),
      ...(body.venue !== undefined && { venue: body.venue.trim() || null }),
      ...(body.matchType !== undefined && { matchType: body.matchType }),
      ...(body.ourScore !== undefined && { ourScore: body.ourScore }),
      ...(body.theirScore !== undefined && { theirScore: body.theirScore }),
      result: resolvedResult,
      ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
      ...(body.opponentId !== undefined && { opponentId: body.opponentId }),
      ...("groupId" in body && { groupId: body.groupId ?? null }),
    },
    select: {
      id: true, slug: true, date: true, isHome: true, venue: true,
      matchType: true, ourScore: true, theirScore: true, result: true,
      notes: true, groupId: true, teamId: true, opponentId: true, createdAt: true,
      team:     { select: { id: true, name: true, season: true } },
      opponent: { select: { id: true, name: true, city: true } },
    },
  });

  // Invia notifica solo quando il risultato viene impostato per la prima volta
  if (resolvedResult && !previous?.result && match.ourScore !== null && match.theirScore !== null) {
    const RESULT_LABEL: Record<string, string> = { WIN: "Vittoria", LOSS: "Sconfitta", DRAW: "Pareggio" };
    const label = RESULT_LABEL[resolvedResult] ?? resolvedResult;
    const score = `${match.ourScore}–${match.theirScore}`;
    const msgTitle = `🏀 ${label}! ${match.team.name} vs ${match.opponent.name}`;
    const msgBody = `Risultato finale: ${score}`;
    const matchUrl = `/partite/${match.slug ?? matchId}`;
    sendPushToAll({ title: msgTitle, body: msgBody, url: matchUrl, type: "MATCH_RESULT" }, false, "MATCH_RESULT").catch(() => {});
    createAppNotification({ type: "MATCH_RESULT", title: msgTitle, body: msgBody, url: matchUrl }).catch(() => {});
  }

  return NextResponse.json(match);
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { matchId } = await params;
  await prisma.match.delete({ where: { id: matchId } });
  return new NextResponse(null, { status: 204 });
}
