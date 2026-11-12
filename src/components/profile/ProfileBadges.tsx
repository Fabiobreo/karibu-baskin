import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { loadBadgeInput, loadBadgeShareSubject, type PlayerRef } from "@/lib/rating/badgeService";
import { computeBadgeState } from "@/lib/rating/badges";
import { getBadgeI18n } from "@/lib/rating/badgeLabels";
import BadgeShowcase, { type EarnedBadgeView } from "@/components/rating/BadgeShowcase";

interface ProfileBadgesProps {
  player: PlayerRef;
  title: string;
  nextTitle?: string;
  emptyLabel?: string;
  /**
   * Il proprio profilo (seconda persona) o quello di un figlio (terza), anche
   * quando il figlio ha un account. Di default: chi è passato come `userId`.
   */
  self?: boolean;
  /** Chiave del figlio nelle ancore dei traguardi (UX-59). */
  anchorKey?: string;
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
  self = Boolean(player.userId),
  anchorKey,
}: ProfileBadgesProps) {
  const [t, locale, badgeI18n, input, rows, shareSubject] = await Promise.all([
    getTranslations("profile"),
    getLocale(),
    getBadgeI18n(),
    loadBadgeInput(player),
    prisma.earnedBadge.findMany({
      where: player.userId ? { userId: player.userId } : { childId: player.childId },
      select: { badgeId: true, unlockedAt: true },
    }),
    // "Condividi" sui traguardi (UX-59): questa vetrina sta solo in /profilo.
    loadBadgeShareSubject(player, self),
  ]);

  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
  const longDateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
  const { earned, locked } = computeBadgeState(input);
  const unlockedMap = new Map(rows.map((r) => [r.badgeId, r.unlockedAt]));
  // Il proprio profilo parla in seconda persona, i figli in terza.
  const earnedView: EarnedBadgeView[] = earned.map((b) => {
    const at = unlockedMap.get(b.id);
    return {
      ...badgeI18n.translate(b, { self }),
      unlockedAtLabel: at ? t("unlockedOn", { date: dateFmt.format(at) }) : null,
      shareDate: at ? longDateFmt.format(at) : null,
    };
  });

  return (
    <BadgeShowcase
      earned={earnedView}
      locked={locked.map((b) => badgeI18n.translate(b))}
      title={title}
      nextTitle={nextTitle}
      emptyLabel={emptyLabel}
      share={shareSubject ?? undefined}
      anchorKey={anchorKey}
    />
  );
}
