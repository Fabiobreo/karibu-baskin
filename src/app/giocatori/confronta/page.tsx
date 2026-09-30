import { Container, Box, Typography, Paper, Avatar, Chip, Divider } from "@mui/material";
import { columnSx } from "@/lib/layout";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDecimal } from "@/lib/numberFormat";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { isMemberRole } from "@/lib/authRoles";
import { isMinor, isMinorChild } from "@/lib/minors";
import { userHasPublicProfile } from "@/lib/publicProfile";
import PageHero from "@/components/common/PageHero";
import ComparePicker from "@/components/common/ComparePicker";
import PointsTrendChart from "@/components/rating/PointsTrendChart";
import { shootingAccuracy } from "@/lib/matches/accuracy";
import { loadBadgeInput } from "@/lib/rating/badgeService";
import { computeBadges } from "@/lib/rating/badges";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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

async function loadComparePlayer(
  key: string,
  viewerIsMember: boolean
): Promise<ComparePlayer | null> {
  const sel = {
    id: true,
    name: true,
    slug: true,
    sportRole: true,
    birthDate: true,
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

  // Utente e figlio in parallelo: il figlio conta solo se l'utente non ha un
  // profilo pubblico (non c'è, è GUEST o è un genitore che non gioca).
  const [user, childMatch] = await Promise.all([
    prisma.user.findFirst({
      where: { OR: [{ slug: key }, { id: key }] },
      select: { ...sel, image: true, customImage: true, appRole: true },
    }),
    prisma.child.findFirst({ where: { OR: [{ slug: key }, { id: key }] }, select: sel }),
  ]);
  const userIsPublic =
    !!user && userHasPublicProfile({ ...user, matchesPlayed: user.matchStats.length });
  const child = userIsPublic ? null : childMatch;

  const row = child ?? (userIsPublic ? user : null);
  if (!row) return null;
  // Tutela dei minori: per chi non è tesserato un minore non è confrontabile.
  const minor = child ? isMinorChild(row.birthDate) : isMinor(row.birthDate);
  if (minor && !viewerIsMember) return null;

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
    accuracy: shootingAccuracy(made, shots),
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
          sx={{
            width: 64,
            height: 64,
            mx: "auto",
            mb: 1,
            fontSize: TYPE_SCALE.xl3,
            cursor: "pointer",
          }}
        >
          {p.name[0]}
        </Avatar>
        <Typography
          variant="subtitle1"
          fontWeight={FONT_WEIGHT.bold}
          noWrap
          sx={{ "&:hover": { textDecoration: "underline" } }}
        >
          {p.name}
        </Typography>
      </Link>
      {p.sportRole && <Chip label={`R${p.sportRole}`} size="small" sx={{ mt: 0.5 }} />}
    </Box>
  );
}

export default async function ConfrontaPage({ searchParams }: Props) {
  const [session, t, { a, b }, locale] = await Promise.all([
    auth(),
    getTranslations("players"),
    searchParams,
    getLocale(),
  ]);
  const viewerIsMember = isMemberRole(session?.user?.appRole);

  const [pa, pb] = await Promise.all([
    a ? loadComparePlayer(a, viewerIsMember) : Promise.resolve(null),
    b ? loadComparePlayer(b, viewerIsMember) : Promise.resolve(null),
  ]);

  const metrics: {
    label: string;
    get: (p: ComparePlayer) => number | null;
    fmt?: (n: number) => string;
  }[] = [
    { label: t("matches"), get: (p) => p.matches },
    { label: t("totalPoints"), get: (p) => p.points },
    { label: t("avgPoints"), get: (p) => p.avg, fmt: (n) => formatDecimal(n, locale) },
    { label: "%", get: (p) => p.accuracy },
    { label: "MVP", get: (p) => p.mvp },
    { label: t("achievements"), get: (p) => p.badges },
  ];

  return (
    <>
      <PageHero column="main" title={t("compareTitle")} subtitle={t("comparePick")} />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={columnSx("main")}>
          <ComparePicker
            initialA={pa ? { slug: pa.slug ?? pa.id, label: pa.name } : null}
            initialB={pb ? { slug: pb.slug ?? pb.id, label: pb.name } : null}
          />

          {pa && pb ? (
            <Paper
              elevation={0}
              variant="outlined"
              sx={{ p: { xs: 2, md: 3 }, borderRadius: RADIUS.lg }}
            >
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
                <Typography variant="overline" color="text.secondary" fontWeight={FONT_WEIGHT.bold}>
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
                      fontWeight={aWins ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold}
                      sx={{
                        // Il migliore resta in grassetto; l'altro si smorza. Niente arancio: non si tocca (UX-29).
                        color: bWins ? "text.secondary" : "text.primary",
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
                        fontWeight: FONT_WEIGHT.semibold,
                        minWidth: 64,
                      }}
                    >
                      {m.label}
                    </Typography>
                    <Typography
                      align="left"
                      fontWeight={bWins ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold}
                      sx={{
                        color: aWins ? "text.secondary" : "text.primary",
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
                    <PointsTrendChart values={pa.trend} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <PointsTrendChart
                      values={pb.trend}
                      colorToken="text.secondary"
                      dashed
                      marker="square"
                    />
                  </Box>
                </Box>
              )}
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
              {t("comparePick")}
            </Typography>
          )}
        </Box>
      </Container>
    </>
  );
}
