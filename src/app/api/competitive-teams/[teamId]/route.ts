import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/apiAuth";
import { CompetitiveTeamUpdateSchema } from "@/lib/schemas/competitiveTeam";

type Params = { params: Promise<{ teamId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { teamId } = await params;

  const team = await prisma.competitiveTeam.findUnique({
    where: { id: teamId },
    include: {
      memberships: {
        orderBy: [{ isCaptain: "desc" }, { createdAt: "asc" }],
        include: {
          user: {
            select: { id: true, name: true, image: true, sportRole: true, sportRoleVariant: true, gender: true },
          },
          child: {
            select: { id: true, name: true, sportRole: true, sportRoleVariant: true, gender: true },
          },
        },
      },
      matches: {
        orderBy: { date: "desc" },
        include: {
          opponent: { select: { id: true, name: true, city: true } },
        },
      },
    },
  });

  if (!team) return NextResponse.json({ error: "Squadra non trovata" }, { status: 404 });
  return NextResponse.json(team);
}

export async function PUT(req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { teamId } = await params;

  // [CLAUDE - 09:00] Validazione Zod — il vecchio codice permetteva name="" (stringa vuota)
  const parsed = CompetitiveTeamUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const team = await prisma.competitiveTeam.update({
    where: { id: teamId },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.season !== undefined && { season: body.season }),
      ...(body.championship !== undefined && { championship: body.championship?.trim() || null }),
      ...(body.color !== undefined && { color: body.color?.trim() || null }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
    },
  });
  return NextResponse.json(team);
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { teamId } = await params;
  await prisma.competitiveTeam.delete({ where: { id: teamId } });
  return new NextResponse(null, { status: 204 });
}
