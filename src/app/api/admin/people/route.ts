import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffGuard } from "@/lib/apiAuth";
import type { AppRole } from "@prisma/client";

export interface AdminPerson {
  kind: "user" | "child";
  id: string;
  name: string;
  /** Solo utenti: distingue due omonimi. */
  email: string | null;
  appRole: AppRole | null;
  sportRole: number | null;
  image: string | null;
  /** Solo figli: chi lo gestisce. */
  parentName: string | null;
}

const LIMIT = 15;

// GET /api/admin/people?q=mar&kind=user|all
// Ricerca persone per i picker dello staff (genitore di un nuovo figlio,
// iscrizione manuale agli allenamenti). `kind=user` esclude i figli.
// I figli che hanno già un account compaiono come utente, non due volte.
export async function GET(req: NextRequest) {
  const denied = await staffGuard();
  if (denied) return denied;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const kind = req.nextUrl.searchParams.get("kind") === "user" ? "user" : "all";
  if (q.length < 2) return NextResponse.json({ people: [] });

  const contains = { contains: q, mode: "insensitive" as const };
  const [users, children] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ name: contains }, { email: contains }] },
      select: {
        id: true,
        name: true,
        email: true,
        appRole: true,
        sportRole: true,
        image: true,
        customImage: true,
      },
      orderBy: { name: "asc" },
      take: LIMIT,
    }),
    kind === "user"
      ? Promise.resolve([])
      : prisma.child.findMany({
          where: { userId: null, OR: [{ name: contains }, { parent: { name: contains } }] },
          select: { id: true, name: true, sportRole: true, parent: { select: { name: true } } },
          orderBy: { name: "asc" },
          take: LIMIT,
        }),
  ]);

  const people: AdminPerson[] = [
    ...users.map((u) => ({
      kind: "user" as const,
      id: u.id,
      name: u.name?.trim() || u.email,
      email: u.email,
      appRole: u.appRole,
      sportRole: u.sportRole,
      image: u.customImage ?? u.image ?? null,
      parentName: null,
    })),
    ...children.map((c) => ({
      kind: "child" as const,
      id: c.id,
      name: c.name,
      email: null,
      appRole: null,
      sportRole: c.sportRole,
      image: null,
      parentName: c.parent.name,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name, "it"));

  return NextResponse.json({ people });
}
