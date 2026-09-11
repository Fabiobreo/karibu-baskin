import { Suspense } from "react";
import { auth } from "@/lib/authjs";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import {
  Breadcrumbs,
  Container,
  Box,
  Typography,
  Chip,
  Grid2 as Grid,
  Skeleton,
  Link as MuiLink,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PageHero from "@/components/common/PageHero";
import { prisma } from "@/lib/db";
import { loadBadgeInput, type PlayerRef } from "@/lib/rating/badgeService";
import { computeAllBadges } from "@/lib/rating/badges";
import { getBadgeI18n } from "@/lib/rating/badgeLabels";
import AchievementsGrid, { type AchievementItem } from "@/components/rating/AchievementsGrid";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "I miei traguardi",
  description: "I traguardi che hai sbloccato con il Karibu Baskin.",
  path: "/profilo/traguardi",
  noindex: true,
});
export const revalidate = 0;

interface AchievementSectionProps {
  player: PlayerRef;
  name: string;
}

/**
 * Traguardi di un giocatore (utente o figlio), con le sue query: ogni sezione
 * sta nel suo `<Suspense>`, così le sezioni si calcolano in parallelo e la
 * hero compare subito.
 */
async function AchievementSection({ player, name }: AchievementSectionProps) {
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

  const unlockedMap = new Map(rows.map((r) => [r.badgeId, r.unlockedAt]));
  const items: AchievementItem[] = computeAllBadges(input).map((b) => {
    const at = b.earned ? unlockedMap.get(b.id) : undefined;
    return {
      ...badgeI18n.translate(b),
      unlockedAtLabel: at ? t("unlockedOn", { date: dateFmt.format(at) }) : null,
    };
  });
  const total = items.length;
  const unlocked = items.filter((b) => b.earned).length;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <EmojiEventsIcon sx={{ color: "primary.main" }} />
          {name}
        </Typography>
        <Chip
          label={t("achievementsProgress", { earned: unlocked, total })}
          color={unlocked > 0 ? "primary" : "default"}
          variant={unlocked > 0 ? "filled" : "outlined"}
          sx={{ fontWeight: 700 }}
        />
      </Box>
      <AchievementsGrid items={items} categoryLabels={badgeI18n.categoryLabels} />
    </>
  );
}

function AchievementSectionSkeleton() {
  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5, mb: 2 }}>
        <Skeleton variant="text" width={200} height={36} />
        <Skeleton variant="rounded" width={110} height={32} sx={{ borderRadius: 4 }} />
      </Box>
      <Grid container spacing={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid key={i} size={{ xs: 6, sm: 4 }}>
            <Skeleton variant="rounded" height={140} />
          </Grid>
        ))}
      </Grid>
    </>
  );
}

export default async function TraguardiPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Solo atleti hanno senso qui; PARENT puro vede comunque i figli.
  const [t, user, children] = await Promise.all([
    getTranslations("profile"),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, appRole: true },
    }),
    prisma.child.findMany({
      where: { parentId: userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!user) redirect("/login");

  const isAthlete =
    user.appRole === "ATHLETE" || user.appRole === "COACH" || user.appRole === "ADMIN";

  const sections: { key: string; name: string; player: PlayerRef }[] = [
    ...(isAthlete ? [{ key: "me", name: user.name ?? t("achievements"), player: { userId } }] : []),
    ...children.map((c) => ({ key: c.id, name: c.name, player: { childId: c.id } })),
  ];

  return (
    <>
      <PageHero
        chip={t("achievementsPageChip")}
        title={t("achievements")}
        subtitle={t("achievementsPageSubtitle")}
        subtitleMaxWidth={520}
        breadcrumb={
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{ "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.4)" } }}
          >
            <MuiLink
              href="/profilo"
              underline="hover"
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "common.white" } }}
            >
              {t("title")}
            </MuiLink>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
              {t("achievementsPageChip")}
            </Typography>
          </Breadcrumbs>
        }
      />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {sections.map((section, i) => (
          <Box key={section.key} sx={{ mb: i < sections.length - 1 ? 6 : 0 }}>
            <Suspense fallback={<AchievementSectionSkeleton />}>
              <AchievementSection player={section.player} name={section.name} />
            </Suspense>
          </Box>
        ))}
      </Container>
    </>
  );
}
