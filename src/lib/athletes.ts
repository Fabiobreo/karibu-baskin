import type { AppRole, AthleteStatus, Gender, Prisma } from "@prisma/client";

/**
 * Chi e' un atleta, per la tab "Atleti" di `/admin/utenti`.
 *
 * Si decide da quello che la persona fa, non dal fatto che abbia un account:
 * - un account con ruolo utente Atleta, anche senza ruolo Baskin (e' la riga da
 *   completare);
 * - un account con un ruolo Baskin anche se nell'app e' genitore, allenatore o
 *   admin (il genitore che gioca);
 * - ogni figlio senza account (li filtra la query: `Child.userId` nullo).
 * Gli ospiti restano fuori: sono in attesa di approvazione.
 */
export function isAthleteAccount(user: { appRole: AppRole; sportRole: number | null }): boolean {
  if (user.appRole === "GUEST") return false;
  return user.appRole === "ATHLETE" || user.sportRole !== null;
}

/** La stessa regola come filtro Prisma. Tenerle allineate (vedi il test). */
export const ATHLETE_ACCOUNT_WHERE: Prisma.UserWhereInput = {
  appRole: { not: "GUEST" },
  OR: [{ appRole: "ATHLETE" }, { sportRole: { not: null } }],
};

/**
 * Chi lo staff puo' iscrivere a mano a un allenamento: tutti gli account tranne
 * il genitore che non gioca (ruolo utente Genitore senza ruolo Baskin), che sta
 * nell'app per gestire i figli. Restano gli ospiti (chi viene a provare) e lo
 * staff, che agli allenamenti puo' partecipare.
 */
export function canBeRegisteredToTraining(user: {
  appRole: AppRole;
  sportRole: number | null;
}): boolean {
  return !(user.appRole === "PARENT" && user.sportRole === null);
}

/** La stessa regola come filtro Prisma. Tenerle allineate (vedi il test). */
export const TRAINING_REGISTRABLE_WHERE: Prisma.UserWhereInput = {
  NOT: { appRole: "PARENT", sportRole: null },
};

/** Filtro di stato della tab: di default solo gli attivi. */
export type AthleteStatusFilter = "active" | "INACTIVE_SEASON" | "FORMER" | "all";
/** Filtro "ha un account?". */
export type AthleteAccountFilter = "" | "with" | "without";

export interface AthleteFilters {
  search: string;
  status: AthleteStatusFilter;
  /** Ruoli Baskin scelti ("1".."5") e "none" per "non impostato". Vuoto = tutti. */
  sportRoles: string[];
  /** "" = tutti, "MALE"/"FEMALE", "none" = non indicato. */
  gender: string;
  /** "" = tutte, id della squadra, "none" = senza squadra nella stagione in corso. */
  teamId: string;
  account: AthleteAccountFilter;
}

export const DEFAULT_ATHLETE_FILTERS: AthleteFilters = {
  search: "",
  status: "active",
  sportRoles: [],
  gender: "",
  teamId: "",
  account: "",
};

/** Il minimo che serve per filtrare una riga, utente o figlio. */
export interface AthleteRowLike {
  kind: "user" | "child";
  name: string | null;
  email?: string;
  guardians?: { name: string | null; email: string }[];
  sportRole: number | null;
  gender: Gender | null;
  athleteStatus: AthleteStatus | null;
  teamMemberships: { teamId: string; team: { season: string } }[];
}

export function matchesAthleteFilters(
  row: AthleteRowLike,
  filters: AthleteFilters,
  currentSeason: string
): boolean {
  if (filters.status === "active" && row.athleteStatus !== null) return false;
  if (filters.status === "INACTIVE_SEASON" || filters.status === "FORMER") {
    if (row.athleteStatus !== filters.status) return false;
  }

  if (filters.account === "with" && row.kind !== "user") return false;
  if (filters.account === "without" && row.kind !== "child") return false;

  if (filters.sportRoles.length > 0) {
    const key = row.sportRole === null ? "none" : String(row.sportRole);
    if (!filters.sportRoles.includes(key)) return false;
  }

  if (filters.gender === "none" && row.gender !== null) return false;
  if (filters.gender && filters.gender !== "none" && row.gender !== filters.gender) return false;

  if (filters.teamId) {
    const current = row.teamMemberships.filter((m) => m.team.season === currentSeason);
    if (
      filters.teamId === "none"
        ? current.length > 0
        : !current.some((m) => m.teamId === filters.teamId)
    )
      return false;
  }

  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = [
      row.name,
      row.email,
      ...(row.guardians ?? []).flatMap((g) => [g.name, g.email]),
    ];
    if (!haystack.some((v) => v?.toLowerCase().includes(q))) return false;
  }
  return true;
}

/** Quanti filtri sono attivi oltre al default (lo stato "attivi" non conta). */
export function countAthleteFilters(filters: AthleteFilters): number {
  return (
    (filters.search.trim() ? 1 : 0) +
    (filters.status !== "active" ? 1 : 0) +
    (filters.sportRoles.length > 0 ? 1 : 0) +
    (filters.gender ? 1 : 0) +
    (filters.teamId ? 1 : 0) +
    (filters.account ? 1 : 0)
  );
}
