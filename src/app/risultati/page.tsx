import { prisma } from "@/lib/db";
import { Container, Typography, Box, Paper, Chip, Stack } from "@mui/material";
import SiteHeader from "@/components/layout/SiteHeader";
import PageHero from "@/components/common/PageHero";
import EmptyState from "@/components/common/EmptyState";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import { format } from "date-fns";
import type { Metadata } from "next";
import { getCurrentSeason } from "@/lib/season/seasonUtils";
import { MATCH_RESULT_META } from "@/lib/matches/matchResults";
import { getEntityLabels } from "@/lib/entityLabels";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";

export const metadata: Metadata = {
  title: "Risultati | Karibu Baskin",
  description:
    "Storico risultati delle partite ufficiali del Karibu Baskin di Montecchio Maggiore.",
};

export const revalidate = 3600;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function RisultatiPage({ searchParams }: Props) {
  const sp = await searchParams;
  const season = sp.season ?? getCurrentSeason();
  const [t, locale, { matchResultLabel }] = await Promise.all([
    getTranslations("matches"),
    getLocale(),
    getEntityLabels(),
  ]);
  const dateLocale = getDateFnsLocale(locale);
  const winShort = t("resultWinShort");
  const drawShort = t("resultDrawShort");
  const lossShort = t("resultLossShort");
  const matchTypeLabel = (type: string) =>
    ({ LEAGUE: t("typeLeague"), TOURNAMENT: t("typeTournament"), FRIENDLY: t("typeFriendly") })[
      type
    ] ?? type;

  // Stagioni disponibili (per i chip filtro)
  const allSeasons = await prisma.competitiveTeam.findMany({
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "desc" },
  });
  const seasons = allSeasons.map((s) => s.season);

  // Partite giocate della stagione, raggruppate per squadra
  const matches = await prisma.match.findMany({
    where: { result: { not: null }, team: { season } },
    orderBy: { date: "desc" },
    select: {
      id: true,
      slug: true,
      date: true,
      isHome: true,
      matchType: true,
      ourScore: true,
      theirScore: true,
      result: true,
      team: { select: { id: true, name: true, color: true, season: true, championship: true } },
      opponent: { select: { id: true, name: true, city: true } },
      opponentTeam: { select: { id: true, name: true } },
    },
  });

  // Raggruppa per squadra (mantieni l'ordine: prima squadra con più partite)
  const teamMap = new Map<
    string,
    {
      id: string;
      name: string;
      color: string | null;
      championship: string | null;
      matches: typeof matches;
    }
  >();
  for (const m of matches) {
    if (!teamMap.has(m.team.id)) {
      teamMap.set(m.team.id, { ...m.team, matches: [] });
    }
    teamMap.get(m.team.id)!.matches.push(m);
  }
  const teamGroups = Array.from(teamMap.values());

  // Statistiche per squadra per il badge hero
  const teamStats = teamGroups.map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    wins: team.matches.filter((m) => m.result === "WIN").length,
    draws: team.matches.filter((m) => m.result === "DRAW").length,
    losses: team.matches.filter((m) => m.result === "LOSS").length,
  }));

  return (
    <>
      <SiteHeader />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <PageHero py={{ xs: 5, md: 7 }} align="left">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <EmojiEventsIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography
            variant="overline"
            color="primary.main"
            fontWeight={700}
            sx={{ letterSpacing: "0.12em" }}
          >
            {t("resultsHeroChip")}
          </Typography>
        </Box>
        <Typography
          variant="h3"
          component="h1"
          fontWeight={800}
          sx={{ mb: 2, fontSize: { xs: "1.9rem", md: "2.6rem" } }}
        >
          {t("resultsTitle")}
        </Typography>
        {teamStats.length > 0 && (
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {teamStats.map((t) => (
              <Box
                key={t.id}
                sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: t.color ?? "primary.main",
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#fff", minWidth: 0 }}>
                  {t.name}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Chip
                    label={`${t.wins}${winShort}`}
                    size="small"
                    sx={{
                      bgcolor: "match.win",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "0.68rem",
                      height: 20,
                    }}
                  />
                  {t.draws > 0 && (
                    <Chip
                      label={`${t.draws}${drawShort}`}
                      size="small"
                      sx={{
                        bgcolor: "match.draw",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "0.68rem",
                        height: 20,
                      }}
                    />
                  )}
                  <Chip
                    label={`${t.losses}${lossShort}`}
                    size="small"
                    sx={{
                      bgcolor: "match.loss",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "0.68rem",
                      height: 20,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </PageHero>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {/* ── Filtri stagione ──────────────────────────────────────────────── */}
        {seasons.length > 1 && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4, alignItems: "center" }}>
            <Typography
              variant="caption"
              color="text.disabled"
              fontWeight={700}
              sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              {t("seasonLabel")}
            </Typography>
            {seasons.map((s) => (
              <Link
                key={s}
                href={`/risultati?season=${encodeURIComponent(s)}`}
                style={{ textDecoration: "none" }}
              >
                <Chip
                  label={s}
                  size="small"
                  variant={season === s ? "filled" : "outlined"}
                  color={season === s ? "primary" : "default"}
                  sx={{ cursor: "pointer", fontWeight: 600, fontSize: "0.72rem" }}
                />
              </Link>
            ))}
          </Box>
        )}

        {/* ── Nessun dato ─────────────────────────────────────────────────── */}
        {teamGroups.length === 0 && (
          <EmptyState
            icon={<EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
            title={`${t("resultsEmpty")} ${season}`}
            message={t("resultsEmptyDesc")}
          />
        )}

        {/* ── Sezioni per squadra ─────────────────────────────────────────── */}
        <Stack spacing={5}>
          {teamGroups.map((team) => {
            const tw = team.matches.filter((m) => m.result === "WIN").length;
            const td = team.matches.filter((m) => m.result === "DRAW").length;
            const tl = team.matches.filter((m) => m.result === "LOSS").length;

            return (
              <Box key={team.id}>
                {/* Team header */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: team.color ?? "primary.main",
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="h6" fontWeight={800}>
                    {team.name}
                  </Typography>
                  {team.championship && (
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {team.championship}
                    </Typography>
                  )}
                  <Box sx={{ ml: "auto", display: "flex", gap: 0.75 }}>
                    <Chip
                      label={`${tw}${winShort}`}
                      size="small"
                      sx={{
                        bgcolor: "match.winBg",
                        color: "match.win",
                        fontWeight: 800,
                        fontSize: "0.68rem",
                        height: 20,
                      }}
                    />
                    {td > 0 && (
                      <Chip
                        label={`${td}${drawShort}`}
                        size="small"
                        sx={{
                          bgcolor: "match.drawBg",
                          color: "match.draw",
                          fontWeight: 800,
                          fontSize: "0.68rem",
                          height: 20,
                        }}
                      />
                    )}
                    <Chip
                      label={`${tl}${lossShort}`}
                      size="small"
                      sx={{
                        bgcolor: "match.lossBg",
                        color: "match.loss",
                        fontWeight: 800,
                        fontSize: "0.68rem",
                        height: 20,
                      }}
                    />
                  </Box>
                </Box>

                {/* Match cards */}
                <Stack spacing={1}>
                  {team.matches.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      tFn={t}
                      dateLocale={dateLocale}
                      matchResultLabel={matchResultLabel}
                    />
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>

        {/* ── Link a prossime partite ─────────────────────────────────────── */}
        {teamGroups.length > 0 && (
          <Box sx={{ textAlign: "right", mt: 4 }}>
            <Link href="/partite" style={{ textDecoration: "none" }}>
              <Typography
                variant="body2"
                color="primary"
                sx={{ fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
              >
                {t("seeMatches")}
              </Typography>
            </Link>
          </Box>
        )}
      </Container>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MatchCard — clickable, link a /partite/[slug]
// ─────────────────────────────────────────────────────────────────────────────

type MatchItem = Awaited<
  ReturnType<
    typeof prisma.match.findMany<{
      select: {
        id: true;
        slug: true;
        date: true;
        isHome: true;
        matchType: true;
        ourScore: true;
        theirScore: true;
        result: true;
        team: { select: { id: true; name: true; color: true; season: true; championship: true } };
        opponent: { select: { id: true; name: true; city: true } };
        opponentTeam: { select: { id: true; name: true } };
      };
    }>
  >
>[number];

function MatchCard({
  match: m,
  tFn,
  dateLocale,
  matchResultLabel,
}: {
  match: MatchItem;
  tFn: (key: string) => string;
  dateLocale: import("date-fns").Locale;
  matchResultLabel: (r: "WIN" | "LOSS" | "DRAW") => string;
}) {
  const meta = m.result ? MATCH_RESULT_META[m.result] : null;

  const opponentName = m.opponent?.name ?? m.opponentTeam?.name ?? tFn("opponent");
  // Ordine casa/trasferta: in casa Karibu a sinistra, in trasferta Karibu a destra.
  const leftName = m.isHome ? m.team.name : opponentName;
  const rightName = m.isHome ? opponentName : m.team.name;
  const leftScore = m.isHome ? m.ourScore : m.theirScore;
  const rightScore = m.isHome ? m.theirScore : m.ourScore;
  const leftIsUs = m.isHome;

  return (
    <Link href={`/partite/${m.slug ?? m.id}`} style={{ textDecoration: "none" }}>
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          cursor: "pointer",
          transition: "box-shadow 0.15s, border-color 0.15s",
          "&:hover": {
            boxShadow: 2,
            borderColor: "text.disabled",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "stretch" }}>
          {/* Barra colore risultato */}
          <Box sx={{ width: 5, flexShrink: 0, bgcolor: meta?.color ?? "action.hover" }} />

          <Box
            sx={{
              flex: 1,
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {/* Data */}
            <Box sx={{ minWidth: 90, flexShrink: 0 }}>
              <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>
                {format(new Date(m.date), "d MMM yyyy", { locale: dateLocale })}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, mt: 0.2 }}>
                {m.isHome ? (
                  <HomeIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                ) : (
                  <FlightIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                )}
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
                  {m.isHome ? tFn("home") : tFn("away")} ·{" "}
                  {(
                    {
                      LEAGUE: tFn("typeLeague"),
                      TOURNAMENT: tFn("typeTournament"),
                      FRIENDLY: tFn("typeFriendly"),
                    } as Record<string, string>
                  )[m.matchType] ?? m.matchType}
                </Typography>
              </Box>
            </Box>

            {/* Match-up: SquadraSx PunteggioSx – PunteggioDx SquadraDx */}
            <Box
              sx={{
                flex: 1,
                minWidth: 200,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                justifyContent: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: leftIsUs ? 800 : 600,
                  color: leftIsUs ? "text.primary" : "text.secondary",
                  textAlign: "right",
                  flex: "1 1 0",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {leftName}
              </Typography>
              {leftScore !== null && rightScore !== null ? (
                <Typography
                  fontWeight={900}
                  sx={{
                    fontSize: "1.15rem",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                    flexShrink: 0,
                    px: 0.5,
                  }}
                >
                  {leftScore}–{rightScore}
                </Typography>
              ) : (
                <Typography
                  sx={{ color: "text.disabled", fontWeight: 700, fontSize: "0.85rem", px: 0.5 }}
                >
                  vs
                </Typography>
              )}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: leftIsUs ? 600 : 800,
                  color: leftIsUs ? "text.secondary" : "text.primary",
                  textAlign: "left",
                  flex: "1 1 0",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {rightName}
              </Typography>
            </Box>

            {/* Esito */}
            <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1 }}>
              {meta && m.result && (
                <Chip
                  label={matchResultLabel(m.result)}
                  size="small"
                  sx={{
                    bgcolor: meta.bg,
                    color: meta.color,
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    height: 22,
                  }}
                />
              )}
              <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled" }} />
            </Box>
          </Box>
        </Box>
      </Paper>
    </Link>
  );
}
