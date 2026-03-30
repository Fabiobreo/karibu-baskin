import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { AppRole, Gender } from "@prisma/client";

const VALID_ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];
const VALID_GENDERS: Gender[] = ["MALE", "FEMALE"];
const VALID_SPORT_ROLES = [1, 2, 3, 4, 5];

// GET /api/users — lista tutti gli utenti (solo ADMIN, protezione via middleware)
export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      appRole: true,
      createdAt: true,
      _count: { select: { registrations: true } },
    },
  });
  return NextResponse.json(users);
}

// POST /api/users — crea utente manualmente (solo ADMIN)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    email?: string;
    name?: string;
    appRole?: AppRole;
    sportRole?: number | null;
    gender?: Gender | null;
    birthDate?: string | null;
  };

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email obbligatoria" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  if (body.appRole && !VALID_ROLES.includes(body.appRole)) {
    return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 });
  }
  if (body.gender && !VALID_GENDERS.includes(body.gender)) {
    return NextResponse.json({ error: "Genere non valido" }, { status: 400 });
  }
  if (body.sportRole && !VALID_SPORT_ROLES.includes(body.sportRole)) {
    return NextResponse.json({ error: "Ruolo Baskin non valido" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Esiste già un utente con questa email" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: body.name?.trim() || null,
      appRole: body.appRole ?? "GUEST",
      sportRole: body.sportRole ?? null,
      gender: body.gender ?? null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
    },
    select: { id: true, email: true, name: true, appRole: true },
  });

  return NextResponse.json(user, { status: 201 });
}
