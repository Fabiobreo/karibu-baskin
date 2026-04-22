import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

// GET /api/users/me/children — figli del genitore loggato
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const children = await prisma.child.findMany({
    where: { parentId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      teamMemberships: {
        select: {
          teamId: true,
          team: { select: { name: true, color: true, season: true } },
        },
      },
    },
  });

  return NextResponse.json(
    children.map(({ teamMemberships, ...child }) => ({
      ...child,
      teamMemberships: teamMemberships.map((m) => ({
        teamId: m.teamId,
        teamName: m.team.name,
        teamColor: m.team.color,
        teamSeason: m.team.season,
      })),
    }))
  );
}

// POST /api/users/me/children — crea un nuovo figlio
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, sportRole, sportRoleVariant, gender, birthDate } = body as {
    name?: string;
    sportRole?: number | null;
    sportRoleVariant?: string | null;
    gender?: string | null;
    birthDate?: string | null;
  };

  const trimmedName = name?.trim().slice(0, 60) ?? "";
  if (!trimmedName) {
    return NextResponse.json({ error: "Il nome è obbligatorio" }, { status: 400 });
  }

  const child = await prisma.child.create({
    data: {
      parentId: session.user.id,
      name: trimmedName,
      sportRole: sportRole ?? null,
      sportRoleVariant: sportRoleVariant ?? null,
      gender: (gender as "MALE" | "FEMALE" | null) ?? null,
      birthDate: birthDate ? new Date(birthDate) : null,
    },
  });

  return NextResponse.json(child, { status: 201 });
}
