import type { MatchStatRow } from "@/components/matches/MatchStatsTable";

/** Atleta convocato (User o Child) con i campi minimi per la lista convocati. */
export interface CallupEntry {
  id: string;
  userId: string | null;
  childId: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    slug: string | null;
    sportRole: number | null;
    sportRoleVariant: string | null;
  } | null;
  child: {
    id: string;
    name: string;
    slug: string | null;
    sportRole: number | null;
    sportRoleVariant: string | null;
  } | null;
}

/** Convocato arricchito con l'eventuale statistica di partita. */
export type CallupWithStat = CallupEntry & { stat: MatchStatRow | null };

/** Anteprima di una partita precedente contro lo stesso avversario. */
export interface PrevMatchPreview {
  id: string;
  slug: string | null;
  date: string;
  ourScore: number | null;
  theirScore: number | null;
  result: string | null;
  isHome: boolean;
}
