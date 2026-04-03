import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

export async function GET() {
  const teams = await prisma.competitiveTeam.findMany({
    orderBy: [{ season: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { memberships: true, matches: true } },
    },
  });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json() as {
    name: string;
    season: string;
    championship?: string;
    color?: string;
    description?: string;
  };

  if (!body.name?.trim() || !body.season?.trim()) {
    return NextResponse.json({ error: "Nome e stagione obbligatori" }, { status: 400 });
  }

  const team = await prisma.competitiveTeam.create({
    data: {
      name: body.name.trim(),
      season: body.season.trim(),
      championship: body.championship?.trim() || null,
      color: body.color?.trim() || null,
      description: body.description?.trim() || null,
    },
  });
  return NextResponse.json(team, { status: 201 });
}
