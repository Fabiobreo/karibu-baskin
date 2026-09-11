import { redirect } from "next/navigation";
import { Container } from "@mui/material";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { isMemberRole } from "@/lib/authRoles";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import { runSimulation } from "@/lib/rating/simulatorServer";
import { simPlayerKey } from "@/lib/rating/simulatorShared";
import type { SimResult } from "@/lib/rating/matchSimulator";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import MatchSimulator, { type SimTeam } from "@/components/teams/MatchSimulator";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Simulatore Sfida",
  description: "Simula una sfida tra due squadre del Karibu Baskin.",
  path: "/squadre/sfida",
  noindex: true,
});
export const revalidate = 0;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SfidaPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Il login è aperto a qualunque account Google (nasce GUEST): la pagina
  // mostra nomi e rose dei tesserati, minori compresi.
  if (!isMemberRole(session.user.appRole)) redirect("/");

  const t = await getTranslations("simulator");
  const sp = await searchParams;

  const currentSeason = await getCurrentSeasonLabel();

  // Nessun ratingMu in questa query: il TrueSkill è visibile solo allo staff e
  // la simulazione avviene sul server (runSimulation), quindi il client non ne
  // ha bisogno e non deve riceverlo.
  const teamsRaw = await prisma.competitiveTeam.findMany({
    // La Karibu non ha rosa propria da cui partire.
    where: { season: currentSeason, isMixed: false },
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
              gender: true,
            },
          },
          child: {
            select: { id: true, name: true, sportRole: true, gender: true },
          },
        },
      },
    },
  });

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

  // Link "sfida" condiviso (?a=&b=&s=): formazioni filtrate sulle rose della
  // stagione e, se entrambe valide, risultato calcolato qui. Il client parte già
  // simulato senza effetti al mount.
  const rosterKeys = new Set(
    teams.flatMap((tm) => tm.roster.map((p) => simPlayerKey(p.kind, p.id)))
  );
  const parseKeys = (v: string | undefined) =>
    v ? v.split(",").filter((k) => rosterKeys.has(k)) : [];
  const selA = parseKeys(firstParam(sp.a));
  const selB = parseKeys(firstParam(sp.b));
  const nonceParsed = Number(firstParam(sp.s) ?? 0);
  const nonce = Number.isInteger(nonceParsed) && nonceParsed >= 0 ? nonceParsed : 0;

  let initialResult: SimResult | null = null;
  if (selA.length > 0 && selB.length > 0) {
    const outcome = await runSimulation(selA, selB, nonce);
    if (outcome.ok) initialResult = outcome.result;
  }

  return (
    <>
      <PageHero chip={t("heroChip")} title={t("heroTitle")} subtitle={t("heroSubtitle")} />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {teams.length === 0 ? (
          <EmptyState
            icon={<SportsKabaddiIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title={t("emptyTitle")}
            message={t("emptyDesc")}
          />
        ) : (
          <MatchSimulator teams={teams} initial={{ selA, selB, nonce, result: initialResult }} />
        )}
      </Container>
    </>
  );
}
