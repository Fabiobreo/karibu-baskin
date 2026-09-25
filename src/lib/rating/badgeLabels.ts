import { getTranslations } from "next-intl/server";
import { BADGE_CATEGORY_ORDER, type BadgeCategory } from "@/lib/rating/badges";

/**
 * Helper server per tradurre label/descrizione dei badge (e le categorie) nella
 * lingua corrente. Le stringhe vivono nei dizionari next-intl (`badges`,
 * `badgeCategories`), keyate sull'id del badge; `badges.ts` mantiene le label
 * italiane come default/fallback e per le notifiche.
 */
export async function getBadgeI18n() {
  const [t, tCat] = await Promise.all([
    getTranslations("badges"),
    getTranslations("badgeCategories"),
  ]);

  /**
   * `description` e' il criterio ("Segnare 10 punti in una partita"),
   * `achieved` la frase per il traguardo raggiunto, sempre visibile: in
   * seconda persona sul proprio profilo, in terza per figli e profili pubblici.
   */
  const translate = <T extends { id: string; label: string; description: string }>(
    b: T,
    opts: { self?: boolean } = {}
  ): T & { achieved: string } => ({
    ...b,
    label: t(`${b.id}.label`),
    description: t(`${b.id}.description`),
    achieved: t(`${b.id}.achieved`, { who: opts.self ? "self" : "other" }),
  });

  const categoryLabels = Object.fromEntries(
    BADGE_CATEGORY_ORDER.map((c) => [c, tCat(c)])
  ) as Record<BadgeCategory, string>;

  return { translate, categoryLabels };
}
