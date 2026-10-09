import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import type { AppRole } from "@prisma/client";
import { auth } from "@/lib/authjs";
import { canViewAdminPanel, isStaffRole } from "@/lib/authRoles";
import { ADMIN_HOME, canOpenAdminSection } from "@/lib/adminNav";

export interface AdminPageAccess {
  session: Session;
  role: AppRole;
  /** Dirigente: guarda soltanto. La pagina non gli mostra comandi di scrittura. */
  readOnly: boolean;
}

/**
 * Guardia delle pagine del pannello: va chiamata in cima a **ogni** `page.tsx`
 * sotto `/admin`. Il layout da solo non basta: apre il pannello anche al
 * dirigente, che vede solo alcune sezioni, e non viene rieseguito a ogni
 * navigazione.
 *
 * `href` è l'indirizzo della sezione in `ADMIN_NAV` (per una sottopagina,
 * quello della sua sezione). `staffOnly` chiude al dirigente una sottopagina di
 * una sezione che per il resto può leggere (i moduli "Nuovo …").
 *
 * Chi non può entrare nel pannello va al login; il dirigente che apre una
 * sezione non sua torna alla dashboard.
 */
export async function requireAdminPage(
  href: string,
  { staffOnly = false }: { staffOnly?: boolean } = {}
): Promise<AdminPageAccess> {
  const session = await auth();
  const role = session?.user?.appRole as AppRole | undefined;
  if (!session?.user || !canViewAdminPanel(role)) redirect("/admin/login");
  const readOnly = !isStaffRole(role);
  if (readOnly && (staffOnly || !canOpenAdminSection(role, href))) redirect(ADMIN_HOME);
  return { session, role: role as AppRole, readOnly };
}
