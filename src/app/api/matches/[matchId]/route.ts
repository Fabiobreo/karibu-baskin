import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import type { MatchType, MatchResult } from "@prisma/client";

type Params = { params: Promise<{ matchId: string }> };

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
  const body = await req.json() as {
    date?: string;
    isHome?: boolean;
    venue?: string;
    matchType?: MatchType;
    ourScore?: number | null;
    theirScore?: number | null;
    result?: MatchResult | null;
    notes?: string;
    opponentId?: string;
  };

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.isHome !== undefined && { isHome: body.isHome }),
      ...(body.venue !== undefined && { venue: body.venue.trim() || null }),
      ...(body.matchType !== undefined && { matchType: body.matchType }),
      ...(body.ourScore !== undefined && { ourScore: body.ourScore }),
      ...(body.theirScore !== undefined && { theirScore: body.theirScore }),
      ...(body.result !== undefined && { result: body.result }),
      ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
      ...(body.opponentId !== undefined && { opponentId: body.opponentId }),
    },
    include: {
      team: { select: { id: true, name: true, season: true } },
      opponent: { select: { id: true, name: true, city: true } },
    },
  });
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
