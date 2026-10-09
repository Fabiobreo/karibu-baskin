/**
 * Le sezioni del pannello staff, in un posto solo (UX-40): le leggono la barra
 * su desktop, il menu su telefono e l'etichetta "dove sono" a menu chiuso.
 * I gruppi sono gli stessi della dashboard.
 */
import type { AppRole } from "@prisma/client";
import { canViewAdminPanel, isStaffRole } from "@/lib/authRoles";

export type AdminNavGroup = "main" | "attivita" | "anagrafiche" | "strumenti";

export interface AdminNavItem {
  label: string;
  href: string;
  group: AdminNavGroup;
  /** Sta nella barra su desktop; le altre voci sono sotto "Altro". */
  inBar?: boolean;
  /**
   * La vede anche il dirigente, in sola lettura. Senza, la sezione è dello
   * staff: aprirne una al dirigente vuol dire anche togliere dalla pagina ogni
   * comando di scrittura (l'API glieli rifiuta comunque).
   */
  director?: boolean;
}

export const ADMIN_NAV_GROUP_LABELS: Record<Exclude<AdminNavGroup, "main">, string> = {
  attivita: "Attività",
  anagrafiche: "Anagrafiche",
  strumenti: "Strumenti",
};

export const ADMIN_HOME = "/admin";

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: ADMIN_HOME, group: "main", inBar: true, director: true },
  {
    label: "Allenamenti",
    href: "/admin/allenamenti",
    group: "attivita",
    inBar: true,
    director: true,
  },
  { label: "Partite", href: "/admin/partite", group: "attivita", inBar: true, director: true },
  { label: "Eventi", href: "/admin/eventi", group: "attivita", inBar: true, director: true },
  { label: "News", href: "/admin/news", group: "attivita", inBar: true, director: true },
  { label: "Gallery", href: "/admin/gallery", group: "attivita", director: true },
  { label: "Utenti", href: "/admin/utenti", group: "anagrafiche", inBar: true, director: true },
  { label: "Squadre", href: "/admin/squadre", group: "anagrafiche", inBar: true, director: true },
  { label: "Gironi", href: "/admin/gironi", group: "anagrafiche" },
  { label: "Squadre avversarie", href: "/admin/avversarie", group: "anagrafiche" },
  { label: "Sviluppo giocatori", href: "/admin/sviluppo", group: "strumenti" },
  { label: "Metriche", href: "/admin/metriche", group: "strumenti", director: true },
  { label: "Esporta dati", href: "/admin/esporta", group: "strumenti", director: true },
  { label: "Suggerimenti", href: "/admin/suggerimenti", group: "strumenti" },
  { label: "Avviso urgente", href: "/admin/avvisi", group: "strumenti" },
  { label: "Registro attività", href: "/admin/audit", group: "strumenti" },
];

/** Le sezioni che un ruolo vede nel menu: tutte per lo staff, alcune per il dirigente. */
export function adminNavFor(role: AppRole | null | undefined): AdminNavItem[] {
  if (isStaffRole(role)) return ADMIN_NAV;
  return canViewAdminPanel(role) ? ADMIN_NAV.filter((i) => i.director) : [];
}

/** Vero se il ruolo può aprire la sezione di questo indirizzo (sottopagine comprese). */
export function canOpenAdminSection(role: AppRole | null | undefined, pathname: string): boolean {
  const section = activeAdminSection(pathname);
  return !!section && adminNavFor(role).some((i) => i.href === section.href);
}

/**
 * La sezione a cui appartiene un indirizzo, sottopagine comprese
 * (`/admin/partite/abc/convocazioni` è "Partite"). `null` fuori dal pannello o
 * su una pagina che non è di nessuna sezione (il login).
 */
export function activeAdminSection(pathname: string | null): AdminNavItem | null {
  if (!pathname) return null;
  if (pathname === ADMIN_HOME) return ADMIN_NAV[0];
  return (
    ADMIN_NAV.find(
      (item) =>
        item.href !== ADMIN_HOME && (pathname === item.href || pathname.startsWith(`${item.href}/`))
    ) ?? null
  );
}
