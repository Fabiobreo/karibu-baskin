import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { ChildCreateSchema } from "@/lib/schemas";
import { generateChildSlug } from "@/lib/slugUtils";

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

  // Fix: gender accettava qualsiasi stringa; ora solo "MALE" | "FEMALE" | null
  const body = await req.json().catch(() => ({}));
  const parsed = ChildCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi" },
      { status: 400 }
    );
  }

  const { name, sportRole, sportRoleVariant, gender, birthDate } = parsed.data;

  const trimmedName = name.trim();
  // Come per gli utenti: senza slug il profilo pubblico del figlio è
  // raggiungibile solo via id. La PATCH lo generava, la create no.
  const slug = await generateChildSlug(trimmedName);

  const child = await prisma.child.create({
    data: {
      parentId: session.user.id,
      name: trimmedName,
      ...(slug ? { slug } : {}),
      sportRole: sportRole ?? null,
      sportRoleVariant: sportRoleVariant ?? null,
      gender: gender ?? null,
      birthDate: birthDate ? new Date(birthDate) : null,
      parentalConsentAt: new Date(),
    },
  });

  return NextResponse.json(child, { status: 201 });
}
