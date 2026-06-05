"use client";
import { useTranslations } from "next-intl";
import type { Gender } from "@prisma/client";

type MatchResult = "WIN" | "LOSS" | "DRAW";

/**
 * Hook per le label condivise (ruolo sportivo, genere, risultato partita) tradotte.
 * Sostituisce ROLE_LABELS / sportRoleLabel / GENDER_LABELS / MATCH_RESULT_META.label
 * hardcoded in italiano.
 */
export function useEntityLabels() {
  const t = useTranslations("roles");
  const tm = useTranslations("matches");
  const tc = useTranslations("teamColors");
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
  };
}
