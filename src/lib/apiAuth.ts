import { auth } from "./authjs";
import { hasRole } from "./authRoles";
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
