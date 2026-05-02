import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";
import { GroupMatchUpdateSchema } from "@/lib/schemas/group";

type Params = { params: Promise<{ groupId: string; matchId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId, matchId } = await params;

  const raw = await req.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }
  const parsed = GroupMatchUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const match = await prisma.groupMatch.findUnique({ where: { id: matchId } });
  if (!match || match.groupId !== groupId) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }

  const updated = await prisma.groupMatch.update({
    where: { id: matchId },
    data: {
      ...("matchday"   in body ? { matchday:  body.matchday  ?? null } : {}),
      ...("date"       in body ? { date:      body.date ? new Date(body.date) : null } : {}),
      ...("homeTeamId" in body ? { homeTeamId: body.homeTeamId } : {}),
      ...("awayTeamId" in body ? { awayTeamId: body.awayTeamId } : {}),
      ...("homeScore"  in body ? { homeScore: body.homeScore ?? null } : {}),
      ...("awayScore"  in body ? { awayScore: body.awayScore ?? null } : {}),
    },
    include: {
      homeTeam: { select: { id: true, name: true, slug: true } },
      awayTeam: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId, matchId } = await params;
  const match = await prisma.groupMatch.findUnique({ where: { id: matchId } });
  if (!match || match.groupId !== groupId) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }

  await prisma.groupMatch.delete({ where: { id: matchId } });
  return new NextResponse(null, { status: 204 });
}
