import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

type Params = { params: Promise<{ groupId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      team: { select: { id: true, name: true, color: true, season: true } },
      matches: {
        orderBy: [{ matchday: "asc" }, { date: "asc" }],
        include: {
          opponent: { select: { id: true, name: true, slug: true, city: true } },
        },
      },
      groupMatches: {
        orderBy: [{ matchday: "asc" }, { date: "asc" }],
        include: {
          homeTeam: { select: { id: true, name: true, slug: true } },
          awayTeam:  { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!group) return NextResponse.json({ error: "Girone non trovato" }, { status: 404 });

  // ── Calcola classifica ───────────────────────────────────────────────────────
  type StandingEntry = {
    id: string; name: string; isOurs: boolean;
    played: number; won: number; drawn: number; lost: number;
    goalsFor: number; goalsAgainst: number; points: number;
  };
  const map = new Map<string, StandingEntry>();

  function getOrCreate(id: string, name: string, isOurs: boolean): StandingEntry {
    if (!map.has(id)) map.set(id, { id, name, isOurs, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    return map.get(id)!;
  }

  function addResult(entry: StandingEntry, gf: number, ga: number) {
    entry.played++;
    entry.goalsFor  += gf;
    entry.goalsAgainst += ga;
    if (gf > ga) { entry.won++;  entry.points += 3; }
    else if (gf === ga) { entry.drawn++; entry.points += 1; }
    else { entry.lost++; }
  }

  // Partite nostre
  for (const m of group.matches) {
    if (m.ourScore == null || m.theirScore == null) continue;
    const ours     = getOrCreate(group.team.id,  group.team.name,   true);
    const theirs   = getOrCreate(m.opponent.id,  m.opponent.name,   false);
    const [ourGF, ourGA] = m.isHome
      ? [m.ourScore, m.theirScore]
      : [m.ourScore, m.theirScore];
    addResult(ours,   ourGF, ourGA);
    addResult(theirs, ourGA, ourGF);
  }

  // Partite esterne
  for (const gm of group.groupMatches) {
    if (gm.homeScore == null || gm.awayScore == null) continue;
    const home = getOrCreate(gm.homeTeamId, gm.homeTeam.name, false);
    const away = getOrCreate(gm.awayTeamId, gm.awayTeam.name, false);
    addResult(home, gm.homeScore, gm.awayScore);
    addResult(away, gm.awayScore, gm.homeScore);
  }

  const standings = Array.from(map.values()).sort((a, b) =>
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor
  );

  return NextResponse.json({ ...group, standings });
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId } = await params;
  const body = await req.json().catch(() => ({})) as {
    name?: string;
    championship?: string | null;
  };

  const group = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...("championship" in body ? { championship: body.championship?.trim() || null } : {}),
    },
    include: {
      team: { select: { id: true, name: true, color: true } },
      _count: { select: { matches: true } },
    },
  });

  return NextResponse.json(group);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { groupId } = await params;
  await prisma.match.updateMany({ where: { groupId }, data: { groupId: null } });
  await prisma.group.delete({ where: { id: groupId } });

  return new NextResponse(null, { status: 204 });
}
