import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { AppRole, Gender } from "@prisma/client";
import { isAdminUser } from "@/lib/apiAuth";

const VALID_ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];
const VALID_GENDERS: Gender[] = ["MALE", "FEMALE"];
const VALID_SPORT_ROLES = [1, 2, 3, 4, 5];
const VALID_SPORT_ROLE_VARIANTS = ["S", "T", "P", "R"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { userId } = await params;
  const body = await req.json().catch(() => ({})) as {
    appRole?: AppRole;
    sportRole?: number | null;
    sportRoleVariant?: string | null;
    gender?: Gender | null;
    birthDate?: string | null;
  };

  const data: Record<string, unknown> = {};

  if (body.appRole !== undefined) {
    if (!VALID_ROLES.includes(body.appRole)) {
      return NextResponse.json({ error: "Ruolo app non valido" }, { status: 400 });
    }
    data.appRole = body.appRole;
  }

  if (body.gender !== undefined) {
    if (body.gender !== null && !VALID_GENDERS.includes(body.gender)) {
      return NextResponse.json({ error: "Genere non valido" }, { status: 400 });
    }
    data.gender = body.gender ?? null;
  }

  if (body.birthDate !== undefined) {
    data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
  }

  if (body.sportRoleVariant !== undefined) {
    if (body.sportRoleVariant !== null && !VALID_SPORT_ROLE_VARIANTS.includes(body.sportRoleVariant)) {
      return NextResponse.json({ error: "Variante ruolo non valida" }, { status: 400 });
    }
    data.sportRoleVariant = body.sportRoleVariant ?? null;
  }

  // sportRole: se cambia, registra nello storico
  if (body.sportRole !== undefined) {
    if (body.sportRole !== null && !VALID_SPORT_ROLES.includes(body.sportRole)) {
      return NextResponse.json({ error: "Ruolo sportivo non valido" }, { status: 400 });
    }
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { sportRole: true } });
    if (current && current.sportRole !== body.sportRole && body.sportRole !== null) {
      await prisma.sportRoleHistory.create({
        data: { userId, sportRole: body.sportRole },
      });
    }
    data.sportRole = body.sportRole ?? null;
    // Quando il ruolo sportivo viene confermato, cancella il suggerimento
    if (body.sportRole !== null) {
      data.sportRoleSuggested = null;
      data.sportRoleSuggestedVariant = null;
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, name: true, email: true, appRole: true,
      sportRole: true, sportRoleVariant: true, gender: true, birthDate: true,
    },
  });

  return NextResponse.json(user);
}
