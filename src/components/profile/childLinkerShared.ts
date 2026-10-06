import { format } from "date-fns";
import type { Locale } from "date-fns";
import type { Gender } from "@prisma/client";

// ── Tipi condivisi del flusso genitore-figlio ────────────────────────────────

export interface ChildData {
  id: string;
  name: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  gender: Gender | null;
  birthDate: string | Date | null;
  userId: string | null;
  user?: { email: string; image: string | null } | null;
  pendingRequestId?: string | null;
  teamMemberships?: { team: { name: string; color: string | null; season: string } }[];
  /** Gli altri genitori collegati, per nome. */
  otherGuardians?: string[];
}

/**
 * Richiesta inviata a un figlio che ha già un account, in attesa di risposta.
 * Non c'è ancora una scheda figlio: nasce quando accetta.
 */
export interface PendingLink {
  requestId: string;
  name: string | null;
  image: string | null;
}

export interface FoundUser {
  id: string;
  name: string | null;
  gender: string | null;
  birthDate: string | null;
  image: string | null;
}

export type AddStep = "choice" | "email" | "name" | "confirm" | "sent" | "create";

export interface ChildFormState {
  name: string;
  gender: string;
  birthDate: string;
}

export const EMPTY_CHILD_FORM: ChildFormState = { name: "", gender: "", birthDate: "" };

// ── Helper ────────────────────────────────────────────────────────────────────

export function formatBirthDate(d: string | null, dateLocale: Locale): string {
  if (!d) return "—";
  try {
    return format(new Date(d), "d MMMM yyyy", { locale: dateLocale });
  } catch {
    return "—";
  }
}
