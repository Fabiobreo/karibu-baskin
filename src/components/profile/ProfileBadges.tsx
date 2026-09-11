import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { loadBadgeInput, type PlayerRef } from "@/lib/rating/badgeService";
import { computeBadgeState } from "@/lib/rating/badges";
import { getBadgeI18n } from "@/lib/rating/badgeLabels";
import BadgeShowcase, { type EarnedBadgeView } from "@/components/rating/BadgeShowcase";

interface ProfileBadgesProps {
  player: PlayerRef;
  title: string;
  nextTitle?: string;
  emptyLabel?: string;
}

/**
 * Badge sbloccati + prossimi traguardi di un giocatore (utente o figlio) —
 * Server Component con le sue query. È la parte più costosa di /profilo:
 * la pagina lo avvolge in `<Suspense>` per mostrare subito il resto.
 */
export default async function ProfileBadges({
  player,
  title,
  nextTitle,
  emptyLabel,
}: ProfileBadgesProps) {
  const [t, locale, badgeI18n, input, rows] = await Promise.all([
    getTranslations("profile"),
    getLocale(),
    getBadgeI18n(),
    loadBadgeInput(player),
    prisma.earnedBadge.findMany({
      where: player.userId ? { userId: player.userId } : { childId: player.childId },
      select: { badgeId: true, unlockedAt: true },
    }),
  ]);

  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const { earned, locked } = computeBadgeState(input);
  const unlockedMap = new Map(rows.map((r) => [r.badgeId, r.unlockedAt]));
  const earnedView: EarnedBadgeView[] = earned.map((b) => {
    const at = unlockedMap.get(b.id);
    return {
      ...badgeI18n.translate(b),
      unlockedAtLabel: at ? t("unlockedOn", { date: dateFmt.format(at) }) : null,
    };
  });

  return (
    <BadgeShowcase
      earned={earnedView}
      locked={locked.map((b) => badgeI18n.translate(b))}
      title={title}
      nextTitle={nextTitle}
      emptyLabel={emptyLabel}
    />
  );
}
