import { NextRequest, NextResponse } from "next/server";
import type { AppRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { staffGuard } from "@/lib/apiAuth";
import { GUARDIANS_SELECT, guardianList, guardianNames } from "@/lib/guardians";

export interface AdminPerson {
  kind: "user" | "child";
  id: string;
  name: string;
  /** Solo utenti: distingue due omonimi. */
  email: string | null;
  appRole: AppRole | null;
  sportRole: number | null;
  image: string | null;
  /** Solo figli: "Anna Rossi e Marco Rossi". */
  parentName: string | null;
  /** Solo figli: id dei genitori, per sapere se uno è già collegato. */
  guardianIds: string[];
}

const LIMIT = 15;
const KINDS = ["user", "child", "all"] as const;
type Kind = (typeof KINDS)[number];

// GET /api/admin/people?q=mar&kind=user|child|all
// Ricerca persone per i picker dello staff.
//  - user:  genitore di un nuovo figlio
//  - child: chi può diventare figlio di un genitore: i figli già registrati
//           (anche con un proprio account: il legame coi genitori resta sul
//           record Child) e gli utenti con account che una scheda figlio non
//           ce l'hanno ancora (es. un atleta figlio di un altro tesserato)
//  - all:   iscrizione manuale agli allenamenti; qui un figlio con account
//           compare una volta sola, come utente
export async function GET(req: NextRequest) {
  const denied = await staffGuard();
  if (denied) return denied;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const rawKind = req.nextUrl.searchParams.get("kind") as Kind | null;
  const kind: Kind = rawKind && KINDS.includes(rawKind) ? rawKind : "all";
  if (q.length < 2) return NextResponse.json({ people: [] });

  const contains = { contains: q, mode: "insensitive" as const };
  const childWhere: Prisma.ChildWhereInput = {
    ...(kind === "all" ? { userId: null } : {}),
    OR: [{ name: contains }, { guardians: { some: { user: { name: contains } } } }],
  };

  const [users, children] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [{ name: contains }, { email: contains }],
        // Chi ha già una scheda figlio compare come figlio, non due volte.
        ...(kind === "child" ? { childAccount: null } : {}),
      },
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
          where: childWhere,
          select: { id: true, name: true, sportRole: true, ...GUARDIANS_SELECT },
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
      guardianIds: [],
    })),
    ...children.map((c) => {
      const guardians = guardianList(c);
      return {
        kind: "child" as const,
        id: c.id,
        name: c.name,
        email: null,
        appRole: null,
        sportRole: c.sportRole,
        image: null,
        parentName: guardians.length > 0 ? guardianNames(guardians) : null,
        guardianIds: guardians.map((g) => g.id),
      };
    }),
  ].sort((a, b) => a.name.localeCompare(b.name, "it"));

  return NextResponse.json({ people });
}
