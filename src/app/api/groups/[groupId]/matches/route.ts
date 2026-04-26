import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type Params = { params: Promise<{ groupId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId } = await params;
  const body = await req.json().catch(() => ({})) as {
    matchday?: number | null;
    date?: string | null;
    homeTeamId?: string;
    awayTeamId?: string;
    homeScore?: number | null;
    awayScore?: number | null;
  };

  if (!body.homeTeamId || !body.awayTeamId) {
    return NextResponse.json({ error: "homeTeamId e awayTeamId sono obbligatori" }, { status: 400 });
  }
  if (body.homeTeamId === body.awayTeamId) {
    return NextResponse.json({ error: "Le squadre devono essere diverse" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "Girone non trovato" }, { status: 404 });

  const match = await prisma.groupMatch.create({
    data: {
      groupId,
      matchday:  body.matchday  ?? null,
      date:      body.date ? new Date(body.date) : null,
      homeTeamId: body.homeTeamId,
      awayTeamId: body.awayTeamId,
      homeScore: body.homeScore ?? null,
      awayScore: body.awayScore ?? null,
    },
    include: {
      homeTeam: { select: { id: true, name: true, slug: true } },
      awayTeam: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json(match, { status: 201 });
}
