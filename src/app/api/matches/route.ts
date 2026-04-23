import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { MatchCreateSchema } from "@/lib/schemas/match";
import type { MatchResult } from "@prisma/client";

function deriveResult(ourScore: number, theirScore: number): MatchResult {
  if (ourScore > theirScore) return "WIN";
  if (ourScore < theirScore) return "LOSS";
  return "DRAW";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  const matches = await prisma.match.findMany({
    where: teamId ? { teamId } : undefined,
    orderBy: { date: "desc" },
    include: {
      team: { select: { id: true, name: true, season: true, color: true } },
      opponent: { select: { id: true, name: true, city: true } },
      _count: { select: { playerStats: true } },
    },
  });
  return NextResponse.json(matches);
}

export async function POST(req: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = MatchCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const body = parsed.data;

  // Auto-derive result from scores; reject contradictions
  let resolvedResult: MatchResult | null = body.result ?? null;
  if (body.ourScore !== undefined && body.theirScore !== undefined) {
    const derived = deriveResult(body.ourScore, body.theirScore);
    if (resolvedResult !== null && resolvedResult !== derived) {
      return NextResponse.json(
        { error: `Il risultato ${resolvedResult} non corrisponde al punteggio (${body.ourScore}–${body.theirScore} → ${derived})` },
        { status: 400 }
      );
    }
    resolvedResult = derived;
  }

  const match = await prisma.match.create({
    data: {
      teamId: body.teamId,
      opponentId: body.opponentId,
      date: new Date(body.date),
      isHome: body.isHome ?? true,
      venue: body.venue?.trim() || null,
      matchType: body.matchType ?? "LEAGUE",
      ourScore: body.ourScore ?? null,
      theirScore: body.theirScore ?? null,
      result: resolvedResult,
      notes: body.notes?.trim() || null,
    },
    include: {
      team: { select: { id: true, name: true, season: true } },
      opponent: { select: { id: true, name: true, city: true } },
    },
  });
  return NextResponse.json(match, { status: 201 });
}
