import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { CompetitiveTeamCreateSchema } from "@/lib/schemas/competitiveTeam";

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

  const parsed = CompetitiveTeamCreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const existingCount = await prisma.competitiveTeam.count({
    where: { season: body.season },
  });
  if (existingCount >= 2) {
    return NextResponse.json({ error: "Massimo 2 squadre per stagione" }, { status: 409 });
  }

  const team = await prisma.competitiveTeam.create({
    data: {
      name: body.name.trim(),
      season: body.season,
      championship: body.championship?.trim() || null,
      color: body.color?.trim() || null,
      description: body.description?.trim() || null,
    },
  });
  return NextResponse.json(team, { status: 201 });
}
