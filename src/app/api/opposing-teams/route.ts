import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";

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

  const body = await req.json() as { name: string; city?: string; notes?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome obbligatorio" }, { status: 400 });
  }

  const team = await prisma.opposingTeam.create({
    data: {
      name: body.name.trim(),
      city: body.city?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(team, { status: 201 });
}
