/**
 * Le sezioni del pannello staff, in un posto solo (UX-40): le leggono la barra
 * su desktop, il menu su telefono e l'etichetta "dove sono" a menu chiuso.
 * I gruppi sono gli stessi della dashboard.
 */
export type AdminNavGroup = "main" | "attivita" | "anagrafiche" | "strumenti";

export interface AdminNavItem {
  label: string;
  href: string;
  group: AdminNavGroup;
  /** Sta nella barra su desktop; le altre voci sono sotto "Altro". */
  inBar?: boolean;
}

export const ADMIN_NAV_GROUP_LABELS: Record<Exclude<AdminNavGroup, "main">, string> = {
  attivita: "Attività",
  anagrafiche: "Anagrafiche",
  strumenti: "Strumenti",
};

export const ADMIN_HOME = "/admin";

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: ADMIN_HOME, group: "main", inBar: true },
  { label: "Allenamenti", href: "/admin/allenamenti", group: "attivita", inBar: true },
  { label: "Partite", href: "/admin/partite", group: "attivita", inBar: true },
  { label: "Eventi", href: "/admin/eventi", group: "attivita", inBar: true },
  { label: "News", href: "/admin/news", group: "attivita", inBar: true },
  { label: "Gallery", href: "/admin/gallery", group: "attivita" },
  { label: "Utenti", href: "/admin/utenti", group: "anagrafiche", inBar: true },
  { label: "Squadre", href: "/admin/squadre", group: "anagrafiche", inBar: true },
  { label: "Gironi", href: "/admin/gironi", group: "anagrafiche" },
  { label: "Squadre avversarie", href: "/admin/avversarie", group: "anagrafiche" },
  { label: "Sviluppo giocatori", href: "/admin/sviluppo", group: "strumenti" },
  { label: "Metriche", href: "/admin/metriche", group: "strumenti" },
  { label: "Esporta dati", href: "/admin/esporta", group: "strumenti" },
  { label: "Suggerimenti", href: "/admin/suggerimenti", group: "strumenti" },
  { label: "Avviso urgente", href: "/admin/avvisi", group: "strumenti" },
  { label: "Registro attività", href: "/admin/audit", group: "strumenti" },
];

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
