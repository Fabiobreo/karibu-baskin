import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { OpposingTeamCreateSchema } from "@/lib/schemas/opposingTeam";

export async function GET() {
  const teams = await prisma.opposingTeam.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { matches: true } } },
  });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = OpposingTeamCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  const body = parsed.data;

  const team = await prisma.opposingTeam.create({
    data: {
      name: body.name.trim(),
      city: body.city?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(team, { status: 201 });
}
