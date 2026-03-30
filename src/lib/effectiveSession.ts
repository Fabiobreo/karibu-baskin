import { auth } from "./authjs";
import { cookies } from "next/headers";
import type { AppRole } from "@prisma/client";

const VALID_ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];

/**
 * Restituisce la sessione con il ruolo effettivo:
 * - Se l'utente è ADMIN e ha un cookie preview_role attivo, override del ruolo
 * - Altrimenti, sessione normale
 */
export async function getEffectiveSession() {
  const session = await auth();
  const cookieStore = await cookies();
  const previewRole = cookieStore.get("preview_role")?.value as AppRole | undefined;

  const isRealAdmin = session?.user?.appRole === "ADMIN";
  const validPreview = previewRole && VALID_ROLES.includes(previewRole);

  if (isRealAdmin && validPreview) {
    return {
      session: { ...session!, user: { ...session!.user, appRole: previewRole! } },
      previewRole: previewRole!,
    };
  }

  return { session, previewRole: null };
}
