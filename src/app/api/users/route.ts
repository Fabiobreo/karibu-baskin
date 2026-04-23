import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { AppRole, Gender, Prisma } from "@prisma/client";
import { isAdminUser } from "@/lib/apiAuth";

const VALID_ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];
const VALID_GENDERS: Gender[] = ["MALE", "FEMALE"];
const VALID_SPORT_ROLES = [1, 2, 3, 4, 5];

// GET /api/users — lista tutti gli utenti (solo ADMIN)
// Supporta: ?search=&appRole=&sportRole=&gender=&sortBy=createdAt&sortDir=desc&page=1&limit=25
export async function GET(req: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.trim() ?? "";
  const appRole = searchParams.get("appRole") as AppRole | null;
  const sportRole = searchParams.get("sportRole"); // "none" | "1"–"5"
  const gender = searchParams.get("gender") as Gender | "none" | null;
  const sortBy = (searchParams.get("sortBy") ?? "createdAt") as "name" | "createdAt" | "appRole" | "sportRole";
  const sortDir = (searchParams.get("sortDir") ?? "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "0", 10)));

  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (appRole && VALID_ROLES.includes(appRole)) where.appRole = appRole;
  if (sportRole === "none") where.sportRole = null;
  else if (sportRole) { const n = parseInt(sportRole, 10); if (!isNaN(n)) where.sportRole = n; }
  if (gender === "none") where.gender = null;
  else if (gender && VALID_GENDERS.includes(gender)) where.gender = gender;

  const orderBy: Prisma.UserOrderByWithRelationInput = sortBy === "name"
    ? { name: sortDir }
    : sortBy === "sportRole"
    ? { sportRole: sortDir }
    : sortBy === "appRole"
    ? { appRole: sortDir }
    : { createdAt: sortDir };

  const select = {
    id: true, name: true, email: true, image: true, appRole: true,
    sportRole: true, sportRoleVariant: true, sportRoleSuggested: true, sportRoleSuggestedVariant: true,
    gender: true, birthDate: true, createdAt: true,
    _count: { select: { registrations: true } },
    sportRoleHistory: { orderBy: { changedAt: "desc" as const }, select: { sportRole: true, changedAt: true } },
  };

  if (limit > 0) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, select }),
      prisma.user.count({ where }),
    ]);
    return NextResponse.json({ users, total, page, limit, pages: Math.ceil(total / limit) });
  }

  const users = await prisma.user.findMany({ where, orderBy, select });
  return NextResponse.json(users);
}

// POST /api/users — crea utente manualmente (solo ADMIN)
export async function POST(req: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
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
