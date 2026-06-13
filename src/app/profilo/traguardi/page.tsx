import { auth } from "@/lib/authjs";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Container, Box, Typography, Chip } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SiteHeader from "@/components/layout/SiteHeader";
import PageHero from "@/components/common/PageHero";
import { prisma } from "@/lib/db";
import { loadBadgeInput, type PlayerRef } from "@/lib/rating/badgeService";
import { computeAllBadges } from "@/lib/rating/badges";
import { getBadgeI18n } from "@/lib/rating/badgeLabels";
import AchievementsGrid, { type AchievementItem } from "@/components/rating/AchievementsGrid";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "I miei traguardi | Karibu Baskin" };
export const revalidate = 0;

export default async function TraguardiPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [t, locale, badgeI18n] = await Promise.all([
    getTranslations("profile"),
    getLocale(),
    getBadgeI18n(),
  ]);
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Solo atleti hanno senso qui; PARENT puro vede comunque i figli.
  const [user, children] = await Promise.all([
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

  async function buildItems(ref: PlayerRef): Promise<AchievementItem[]> {
    const input = await loadBadgeInput(ref);
    const all = computeAllBadges(input);
    const rows = await prisma.earnedBadge.findMany({
      where: ref.userId ? { userId: ref.userId } : { childId: ref.childId },
      select: { badgeId: true, unlockedAt: true },
    });
    const unlockedMap = new Map(rows.map((r) => [r.badgeId, r.unlockedAt]));
    return all.map((b) => {
      const at = b.earned ? unlockedMap.get(b.id) : undefined;
      return {
        ...badgeI18n.translate(b),
        unlockedAtLabel: at ? t("unlockedOn", { date: dateFmt.format(at) }) : null,
      };
    });
  }

  const isAthlete =
    user.appRole === "ATHLETE" || user.appRole === "COACH" || user.appRole === "ADMIN";

  const sections: { name: string | null; items: AchievementItem[] }[] = [];
  if (isAthlete) sections.push({ name: null, items: await buildItems({ userId }) });
  for (const c of children) {
    sections.push({ name: c.name, items: await buildItems({ childId: c.id }) });
  }

  return (
    <>
      <SiteHeader />
      <PageHero
        chip={t("achievementsPageChip")}
        title={t("achievements")}
        subtitle={t("achievementsPageSubtitle")}
        subtitleMaxWidth={520}
      />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {sections.map((section, i) => {
          const total = section.items.length;
          const unlocked = section.items.filter((b) => b.earned).length;
          return (
            <Box key={section.name ?? "me"} sx={{ mb: i < sections.length - 1 ? 6 : 0 }}>
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
                  {section.name ?? user.name ?? t("achievements")}
                </Typography>
                <Chip
                  label={t("achievementsProgress", { earned: unlocked, total })}
                  color={unlocked > 0 ? "primary" : "default"}
                  variant={unlocked > 0 ? "filled" : "outlined"}
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <AchievementsGrid items={section.items} categoryLabels={badgeI18n.categoryLabels} />
            </Box>
          );
        })}
      </Container>
    </>
  );
}
