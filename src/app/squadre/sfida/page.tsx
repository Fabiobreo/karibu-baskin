import { redirect } from "next/navigation";
import { Container } from "@mui/material";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import SiteHeader from "@/components/layout/SiteHeader";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import MatchSimulator, { type SimTeam } from "@/components/teams/MatchSimulator";

export const metadata: Metadata = { title: "Simulatore Sfida | Karibu Baskin" };
export const revalidate = 0;

export default async function SfidaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("simulator");

  const currentSeason =
    (await prisma.season.findFirst({ where: { isCurrent: true } }))?.label ?? null;

  const teamsRaw = currentSeason
    ? await prisma.competitiveTeam.findMany({
        where: { season: currentSeason },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          memberships: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  customImage: true,
                  sportRole: true,
                  ratingMu: true,
                  gender: true,
                },
              },
              child: {
                select: { id: true, name: true, sportRole: true, ratingMu: true, gender: true },
              },
            },
          },
        },
      })
    : [];

  const teams: SimTeam[] = teamsRaw
    .map((team) => ({
      id: team.id,
      name: team.name,
      roster: team.memberships
        .map((m): SimTeam["roster"][number] | null => {
          if (m.user) {
            return {
              id: m.user.id,
              kind: "user",
              name: m.user.name ?? "—",
              image: m.user.customImage ?? m.user.image ?? null,
              sportRole: m.user.sportRole,
              mu: m.user.ratingMu,
              gender: m.user.gender,
              teamName: team.name,
            };
          }
          if (m.child) {
            return {
              id: m.child.id,
              kind: "child",
              name: m.child.name,
              image: null,
              sportRole: m.child.sportRole,
              mu: m.child.ratingMu,
              gender: m.child.gender,
              teamName: team.name,
            };
          }
          return null;
        })
        .filter((p): p is SimTeam["roster"][number] => p !== null)
        .sort((a, b) => (a.sportRole ?? 99) - (b.sportRole ?? 99) || a.name.localeCompare(b.name)),
    }))
    .filter((team) => team.roster.length > 0);

  return (
    <>
      <SiteHeader />
      <PageHero chip={t("heroChip")} title={t("heroTitle")} subtitle={t("heroSubtitle")} />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {teams.length === 0 ? (
          <EmptyState
            icon={<SportsKabaddiIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title={t("emptyTitle")}
            message={t("emptyDesc")}
          />
        ) : (
          <MatchSimulator teams={teams} />
        )}
      </Container>
    </>
  );
}
