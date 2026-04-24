import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCoachOrAdmin } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const season = req.nextUrl.searchParams.get("season");
  const teamId = req.nextUrl.searchParams.get("teamId");

  const groups = await prisma.group.findMany({
    where: {
      ...(season ? { season } : {}),
      ...(teamId ? { teamId } : {}),
    },
    orderBy: [{ season: "desc" }, { name: "asc" }],
    include: {
      team: { select: { id: true, name: true, color: true } },
      _count: { select: { matches: true } },
    },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  if (!(await isCoachOrAdmin())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as {
    name?: string;
    season?: string;
    championship?: string;
    teamId?: string;
  };

  if (!body.name?.trim() || !body.season?.trim() || !body.teamId) {
    return NextResponse.json({ error: "name, season e teamId sono obbligatori" }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: {
      name: body.name.trim(),
      season: body.season.trim(),
      championship: body.championship?.trim() || null,
      teamId: body.teamId,
    },
    include: {
      team: { select: { id: true, name: true, color: true } },
      _count: { select: { matches: true } },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
