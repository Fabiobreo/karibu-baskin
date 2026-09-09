import { Container, Box, Typography, Paper, Avatar, Chip, Divider } from "@mui/material";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import SiteHeader from "@/components/layout/SiteHeader";
import PageHero from "@/components/common/PageHero";
import ComparePicker from "@/components/common/ComparePicker";
import PointsTrendChart from "@/components/rating/PointsTrendChart";
import { loadBadgeInput } from "@/lib/rating/badgeService";
import { computeBadges } from "@/lib/rating/badges";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Confronto giocatori",
  description:
    "Metti a confronto statistiche, punti e traguardi di due giocatori del Karibu Baskin.",
  path: "/giocatori/confronta",
});
export const revalidate = 0;

type Props = { searchParams: Promise<{ a?: string; b?: string }> };

type ComparePlayer = {
  id: string;
  kind: "user" | "child";
  name: string;
  slug: string | null;
  image: string | null;
  sportRole: number | null;
  matches: number;
  points: number;
  avg: number;
  accuracy: number | null;
  mvp: number;
  badges: number;
  trend: number[];
};

async function loadComparePlayer(key: string): Promise<ComparePlayer | null> {
  const sel = {
    id: true,
    name: true,
    slug: true,
    sportRole: true,
    matchStats: {
      orderBy: { match: { date: "asc" as const } },
      select: {
        points: true,
        twoPointers: true,
        threePointers: true,
        freeThrows: true,
        shotsAttempted: true,
      },
    },
    _count: { select: { matchMvps: true } },
  };

  const user = await prisma.user.findFirst({
    where: { OR: [{ slug: key }, { id: key }] },
    select: { ...sel, image: true, customImage: true, appRole: true },
  });
  const child =
    user && user.appRole !== "GUEST"
      ? null
      : await prisma.child.findFirst({ where: { OR: [{ slug: key }, { id: key }] }, select: sel });

  const row = child ?? (user && user.appRole !== "GUEST" ? user : null);
  if (!row) return null;

  const stats = row.matchStats;
  const matches = stats.length;
  const points = stats.reduce((s, m) => s + m.points, 0);
  const made = stats.reduce((s, m) => s + m.twoPointers + m.threePointers + m.freeThrows, 0);
  const shots = stats.reduce((s, m) => s + m.shotsAttempted, 0);
  const badgeInput = await loadBadgeInput(child ? { childId: row.id } : { userId: row.id });

  return {
    id: row.id,
    kind: child ? "child" : "user",
    name: row.name ?? "—",
    slug: row.slug,
    image: child ? null : (user?.customImage ?? user?.image ?? null),
    sportRole: row.sportRole,
    matches,
    points,
    avg: matches > 0 ? points / matches : 0,
    accuracy: shots > 0 ? Math.round((made / shots) * 100) : null,
    mvp: row._count.matchMvps,
    badges: computeBadges(badgeInput).length,
    trend: stats.map((m) => m.points),
  };
}

function CompareHeader({ p }: { p: ComparePlayer }) {
  const href = `/giocatori/${p.slug ?? p.id}`;
  return (
    <Box sx={{ textAlign: "center" }}>
      <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
        <Avatar
          src={p.image ?? undefined}
          sx={{ width: 64, height: 64, mx: "auto", mb: 1, fontSize: 26, cursor: "pointer" }}
        >
          {p.name[0]}
        </Avatar>
        <Typography
          variant="subtitle1"
          fontWeight={800}
          noWrap
          sx={{ "&:hover": { textDecoration: "underline" } }}
        >
          {p.name}
        </Typography>
      </Link>
      {p.sportRole && (
        <Chip label={`R${p.sportRole}`} size="small" sx={{ mt: 0.5, fontWeight: 700 }} />
      )}
    </Box>
  );
}

export default async function ConfrontaPage({ searchParams }: Props) {
  const t = await getTranslations("players");
  const { a, b } = await searchParams;

  const [pa, pb] = await Promise.all([
    a ? loadComparePlayer(a) : Promise.resolve(null),
    b ? loadComparePlayer(b) : Promise.resolve(null),
  ]);

  const metrics: {
    label: string;
    get: (p: ComparePlayer) => number | null;
    fmt?: (n: number) => string;
  }[] = [
    { label: t("matches"), get: (p) => p.matches },
    { label: t("totalPoints"), get: (p) => p.points },
    { label: t("avgPoints"), get: (p) => p.avg, fmt: (n) => n.toFixed(1) },
    { label: "%", get: (p) => p.accuracy },
    { label: "MVP", get: (p) => p.mvp },
    { label: t("achievements"), get: (p) => p.badges },
  ];

  return (
    <>
      <SiteHeader />
      <PageHero chip={t("compare")} title={t("compareTitle")} subtitle={t("comparePick")} />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <ComparePicker
          initialA={pa ? { slug: pa.slug ?? pa.id, label: pa.name } : null}
          initialB={pb ? { slug: pb.slug ?? pb.id, label: pb.name } : null}
        />

        {pa && pb ? (
          <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: 2,
                mb: 2,
              }}
            >
              <CompareHeader p={pa} />
              <Typography variant="overline" color="text.disabled" fontWeight={800}>
                {t("compareVs")}
              </Typography>
              <CompareHeader p={pb} />
            </Box>

            <Divider sx={{ mb: 1 }} />

            {metrics.map((m) => {
              const va = m.get(pa);
              const vb = m.get(pb);
              const aWins = va != null && vb != null && va > vb;
              const bWins = va != null && vb != null && vb > va;
              const show = (v: number | null) => (v == null ? "—" : m.fmt ? m.fmt(v) : String(v));
              return (
                <Box
                  key={m.label}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    alignItems: "center",
                    gap: 2,
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-child": { borderBottom: 0 },
                  }}
                >
                  <Typography
                    align="right"
                    fontWeight={aWins ? 900 : 600}
                    sx={{
                      color: aWins ? "primary.main" : "text.primary",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {show(va)}
                  </Typography>
                  <Typography
                    variant="caption"
                    align="center"
                    color="text.secondary"
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 700,
                      minWidth: 64,
                    }}
                  >
                    {m.label}
                  </Typography>
                  <Typography
                    align="left"
                    fontWeight={bWins ? 900 : 600}
                    sx={{
                      color: bWins ? "primary.main" : "text.primary",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {show(vb)}
                  </Typography>
                </Box>
              );
            })}

            {(pa.trend.length >= 3 || pb.trend.length >= 3) && (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 3 }}>
                <Box sx={{ minWidth: 0 }}>
                  <PointsTrendChart values={pa.trend} colorToken="primary.main" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <PointsTrendChart values={pb.trend} colorToken="secondary.main" />
                </Box>
              </Box>
            )}
          </Paper>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            {t("comparePick")}
          </Typography>
        )}
      </Container>
    </>
  );
}
