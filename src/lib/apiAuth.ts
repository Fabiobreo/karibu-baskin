import { NextResponse } from "next/server";
import { auth } from "./authjs";
import { hasRole, isMemberRole } from "./authRoles";
import type { AppRole } from "@prisma/client";

/** Vero se l'utente è autenticato come COACH o superiore */
export async function isCoachOrAdmin(): Promise<boolean> {
  const session = await auth();
  const role = session?.user?.appRole as AppRole | undefined;
  return !!role && hasRole(role, "COACH");
}

/** Vero se l'utente è autenticato come ADMIN */
export async function isAdminUser(): Promise<boolean> {
  const session = await auth();
  const role = session?.user?.appRole as AppRole | undefined;
  return !!role && hasRole(role, "ADMIN");
}

/**
 * Vero se chi fa la richiesta è un tesserato (ATHLETE o superiore).
 * Autenticato non vuol dire tesserato: vedi `isMemberRole` in @/lib/authRoles.
 */
export async function isMember(): Promise<boolean> {
  const session = await auth();
  return isMemberRole(session?.user?.appRole);
}

/**
 * Guardia per le rotte dello staff: `null` se l'utente è COACH o superiore,
 * altrimenti la risposta da restituire.
 *
 * Distingue i due casi che `isCoachOrAdmin()` accorpa: 401 senza sessione, 403
 * con una sessione valida ma senza permessi. Non è pignoleria: alcuni client
 * reagiscono al 401 forzando un nuovo login, che a un atleta già autenticato
 * non servirebbe a nulla (KB-38).
 */
export async function staffGuard(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const role = session.user.appRole as AppRole | undefined;
  if (!role || !hasRole(role, "COACH")) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  return null;
}
