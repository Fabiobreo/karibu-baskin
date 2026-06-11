import { getTranslations } from "next-intl/server";
import type { Gender, MatchType } from "@prisma/client";

type MatchResult = "WIN" | "LOSS" | "DRAW";

/**
 * Versione Server Component dei helper per le label condivise (ruolo, genere, risultato).
 * Uso: `const labels = await getEntityLabels();` poi `labels.roleLabel(n)`.
 */
export async function getEntityLabels() {
  const [t, tm, tc] = await Promise.all([
    getTranslations("roles"),
    getTranslations("matches"),
    getTranslations("teamColors"),
  ]);
  return {
    roleLabel: (n: number) => t("role", { n }),
    sportRoleLabel: (n: number, variant?: string | null) => t("sportRole", { n, v: variant ?? "" }),
    genderLabel: (g: Gender) => (g === "MALE" ? t("genderMale") : t("genderFemale")),
    teamColorLabel: (key: "teamA" | "teamB" | "teamC") => tc(key),
    matchResultLabel: (r: MatchResult) =>
      r === "WIN" ? tm("resultWin") : r === "LOSS" ? tm("resultLoss") : tm("resultDraw"),
    matchResultShort: (r: MatchResult) =>
      r === "WIN"
        ? tm("resultWinShort")
        : r === "LOSS"
          ? tm("resultLossShort")
          : tm("resultDrawShort"),
    matchTypeLabel: (ty: MatchType) =>
      ty === "LEAGUE"
        ? tm("typeLeague")
        : ty === "TOURNAMENT"
          ? tm("typeTournament")
          : tm("typeFriendly"),
    matchTypeShort: (ty: MatchType) =>
      ty === "LEAGUE"
        ? tm("typeLeagueShort")
        : ty === "TOURNAMENT"
          ? tm("typeTournamentShort")
          : tm("typeFriendlyShort"),
  };
}
