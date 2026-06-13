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

  const translate = <T extends { id: string; label: string; description: string }>(b: T): T => ({
    ...b,
    label: t(`${b.id}.label`),
    description: t(`${b.id}.description`),
  });

  const categoryLabels = Object.fromEntries(
    BADGE_CATEGORY_ORDER.map((c) => [c, tCat(c)])
  ) as Record<BadgeCategory, string>;

  return { translate, categoryLabels };
}
