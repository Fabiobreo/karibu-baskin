import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import type { MatchType, MatchResult } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  const matches = await prisma.officialMatch.findMany({
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

  const body = await req.json() as {
    teamId: string;
    opponentId: string;
    date: string;
    isHome?: boolean;
    venue?: string;
    matchType?: MatchType;
    ourScore?: number;
    theirScore?: number;
    result?: MatchResult;
    notes?: string;
  };

  if (!body.teamId || !body.opponentId || !body.date) {
    return NextResponse.json({ error: "teamId, opponentId e date obbligatori" }, { status: 400 });
  }

  const match = await prisma.officialMatch.create({
    data: {
      teamId: body.teamId,
      opponentId: body.opponentId,
      date: new Date(body.date),
      isHome: body.isHome ?? true,
      venue: body.venue?.trim() || null,
      matchType: body.matchType ?? "LEAGUE",
      ourScore: body.ourScore ?? null,
      theirScore: body.theirScore ?? null,
      result: body.result ?? null,
      notes: body.notes?.trim() || null,
    },
    include: {
      team: { select: { id: true, name: true, season: true } },
      opponent: { select: { id: true, name: true, city: true } },
    },
  });
  return NextResponse.json(match, { status: 201 });
}
