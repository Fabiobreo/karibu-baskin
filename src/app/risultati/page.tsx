import { prisma } from "@/lib/db";
import {
  Container, Typography, Box, Paper, Chip, Stack, Divider,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Metadata } from "next";
import type { MatchResult, MatchType } from "@prisma/client";

export const metadata: Metadata = {
  title: "Risultati | Karibu Baskin",
  description: "Storico risultati delle partite ufficiali del Karibu Baskin di Montecchio Maggiore.",
};

export const revalidate = 3600;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

const RESULT_COLOR: Record<MatchResult, string> = {
  WIN:  "#2E7D32",
  LOSS: "#C62828",
  DRAW: "#E65100",
};
const RESULT_LABEL: Record<MatchResult, string> = {
  WIN:  "V",
  LOSS: "S",
  DRAW: "P",
};
const RESULT_FULL: Record<MatchResult, string> = {
  WIN:  "Vittoria",
  LOSS: "Sconfitta",
  DRAW: "Pareggio",
};
const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  LEAGUE:     "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY:   "Amichevole",
};

function currentSeason(): string {
  const now = new Date();
  const y   = now.getFullYear();
  const s   = now.getMonth() >= 8 ? y : y - 1;
  return `${s}-${String(s + 1).slice(-2)}`;
}

export default async function RisultatiPage({ searchParams }: Props) {
  const sp     = await searchParams;
  const season = sp.season ?? currentSeason();

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
      id: true, slug: true, date: true, isHome: true, matchType: true,
      ourScore: true, theirScore: true, result: true,
      team:     { select: { id: true, name: true, color: true, season: true, championship: true } },
      opponent: { select: { name: true, city: true } },
    },
  });

  // Partite future della stagione
  const upcoming = await prisma.match.findMany({
    where: { result: null, date: { gte: new Date() }, team: { season } },
    orderBy: { date: "asc" },
    select: {
      id: true, slug: true, date: true, isHome: true,
      team:     { select: { id: true, name: true, color: true } },
      opponent: { select: { name: true, city: true } },
    },
  });

  // Raggruppa per squadra (mantieni l'ordine: prima squadra con più partite)
  const teamMap = new Map<string, { id: string; name: string; color: string | null; championship: string | null; matches: typeof matches }>();
  for (const m of matches) {
    if (!teamMap.has(m.team.id)) {
      teamMap.set(m.team.id, { ...m.team, matches: [] });
    }
    teamMap.get(m.team.id)!.matches.push(m);
  }
  const teamGroups = Array.from(teamMap.values());

  // Statistiche per il badge hero
  const wins   = matches.filter((m) => m.result === "WIN").length;
  const losses = matches.filter((m) => m.result === "LOSS").length;
  const draws  = matches.filter((m) => m.result === "DRAW").length;

  return (
    <>
      <SiteHeader />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          py: { xs: 5, md: 7 },
          px: 2,
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <EmojiEventsIcon sx={{ fontSize: 32, color: "primary.main" }} />
            <Typography variant="overline" color="primary.main" fontWeight={700} sx={{ letterSpacing: "0.12em" }}>
              Risultati
            </Typography>
          </Box>
          <Typography variant="h3" fontWeight={800} sx={{ mb: 2, fontSize: { xs: "1.9rem", md: "2.6rem" } }}>
            Partite ufficiali
          </Typography>
          {matches.length > 0 && (
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Chip label={`${wins} ${wins === 1 ? "vittoria" : "vittorie"}`} size="small"
                sx={{ bgcolor: "#2E7D32", color: "#fff", fontWeight: 700 }} />
              {draws > 0 && <Chip label={`${draws} ${draws === 1 ? "pareggio" : "pareggi"}`} size="small"
                sx={{ bgcolor: "#E65100", color: "#fff", fontWeight: 700 }} />}
              <Chip label={`${losses} ${losses === 1 ? "sconfitta" : "sconfitte"}`} size="small"
                sx={{ bgcolor: "#C62828", color: "#fff", fontWeight: 700 }} />
            </Box>
          )}
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>

        {/* ── Filtri stagione ──────────────────────────────────────────────── */}
        {seasons.length > 1 && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4, alignItems: "center" }}>
            <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Stagione:
            </Typography>
            {seasons.map((s) => (
              <Link key={s} href={`/risultati?season=${encodeURIComponent(s)}`} style={{ textDecoration: "none" }}>
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
        {teamGroups.length === 0 && upcoming.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Nessun risultato per la stagione {season}</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              I risultati verranno pubblicati al termine delle partite.
            </Typography>
          </Box>
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
                    display: "flex", alignItems: "center", gap: 1.5, mb: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box
                    sx={{
                      width: 12, height: 12, borderRadius: "50%",
                      bgcolor: team.color ?? "#E65100", flexShrink: 0,
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
                    <Chip label={`${tw}V`} size="small" sx={{ bgcolor: "#E8F5E9", color: "#2E7D32", fontWeight: 800, fontSize: "0.68rem", height: 20 }} />
                    {td > 0 && <Chip label={`${td}P`} size="small" sx={{ bgcolor: "#FFF3E0", color: "#E65100", fontWeight: 800, fontSize: "0.68rem", height: 20 }} />}
                    <Chip label={`${tl}S`} size="small" sx={{ bgcolor: "#FFEBEE", color: "#C62828", fontWeight: 800, fontSize: "0.68rem", height: 20 }} />
                  </Box>
                </Box>

                {/* Match cards */}
                <Stack spacing={1}>
                  {team.matches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>

        {/* ── Prossime partite ────────────────────────────────────────────── */}
        {upcoming.length > 0 && (
          <>
            {teamGroups.length > 0 && <Divider sx={{ my: 5 }} />}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <CalendarTodayIcon color="primary" sx={{ fontSize: 18 }} />
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                In programma
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Prossime partite</Typography>
            <Stack spacing={1}>
              {upcoming.map((m) => (
                <Link key={m.id} href={`/partite/${m.slug ?? m.id}`} style={{ textDecoration: "none" }}>
                  <Paper
                    elevation={0}
                    sx={{
                      border: "1px solid rgba(0,0,0,0.07)",
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      flexWrap: "wrap",
                      borderLeft: `4px solid ${m.team.color ?? "#E65100"}`,
                      cursor: "pointer",
                      transition: "box-shadow 0.15s, border-color 0.15s",
                      "&:hover": {
                        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                        borderColor: "rgba(0,0,0,0.15)",
                      },
                    }}
                  >
                    <Chip
                      label={m.team.name}
                      size="small"
                      sx={{ bgcolor: m.team.color ?? "#E65100", color: "#fff", fontWeight: 700, fontSize: "0.65rem" }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700}>
                        vs {m.opponent.name}
                        {m.opponent.city ? <Typography component="span" variant="caption" color="text.secondary"> ({m.opponent.city})</Typography> : null}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(m.date), "EEEE d MMMM · HH:mm", { locale: it })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={m.isHome ? "Casa" : "Trasferta"}
                        size="small"
                        variant="outlined"
                        icon={m.isHome ? <HomeIcon /> : <FlightIcon />}
                        sx={{ fontSize: "0.65rem" }}
                      />
                      <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                    </Box>
                  </Paper>
                </Link>
              ))}
            </Stack>
          </>
        )}
      </Container>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MatchCard — clickable, link a /partite/[slug]
// ─────────────────────────────────────────────────────────────────────────────

type MatchItem = Awaited<ReturnType<typeof prisma.match.findMany<{
  select: {
    id: true; slug: true; date: true; isHome: true; matchType: true;
    ourScore: true; theirScore: true; result: true;
    team:     { select: { id: true; name: true; color: true; season: true; championship: true } };
    opponent: { select: { name: true; city: true } };
  };
}>>>[number];

function MatchCard({ match: m }: { match: MatchItem }) {
  const res = m.result ? {
    color: RESULT_COLOR[m.result],
    label: RESULT_LABEL[m.result],
    full:  RESULT_FULL[m.result],
    bg:    m.result === "WIN" ? "#E8F5E9" : m.result === "LOSS" ? "#FFEBEE" : "#FFF3E0",
    textColor: m.result === "WIN" ? "#2E7D32" : m.result === "LOSS" ? "#C62828" : "#E65100",
  } : null;

  return (
    <Link href={`/partite/${m.slug ?? m.id}`} style={{ textDecoration: "none" }}>
      <Paper
        elevation={0}
        sx={{
          border: "1px solid rgba(0,0,0,0.07)",
          overflow: "hidden",
          cursor: "pointer",
          transition: "box-shadow 0.15s, border-color 0.15s",
          "&:hover": {
            boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
            borderColor: "rgba(0,0,0,0.15)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "stretch" }}>
          {/* Barra colore risultato */}
          <Box sx={{ width: 5, flexShrink: 0, bgcolor: res?.color ?? "rgba(0,0,0,0.08)" }} />

          <Box sx={{ flex: 1, px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>

            {/* Data */}
            <Box sx={{ minWidth: 90, flexShrink: 0 }}>
              <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>
                {format(new Date(m.date), "d MMM yyyy", { locale: it })}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, mt: 0.2 }}>
                {m.isHome
                  ? <HomeIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                  : <FlightIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                }
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
                  {m.isHome ? "Casa" : "Trasferta"} · {MATCH_TYPE_LABEL[m.matchType]}
                </Typography>
              </Box>
            </Box>

            {/* Avversario */}
            <Box sx={{ flex: 1, minWidth: 100 }}>
              <Typography variant="body2" fontWeight={700}>
                vs {m.opponent.name}
              </Typography>
              {m.opponent.city && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
                  {m.opponent.city}
                </Typography>
              )}
            </Box>

            {/* Punteggio */}
            {m.ourScore !== null && m.theirScore !== null && (
              <Box sx={{ flexShrink: 0, textAlign: "center", minWidth: 56 }}>
                <Typography
                  variant="body1"
                  fontWeight={900}
                  sx={{ fontSize: "1.15rem", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
                >
                  {m.ourScore}–{m.theirScore}
                </Typography>
              </Box>
            )}

            {/* Esito */}
            <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1 }}>
              {res && (
                <Chip
                  label={res.full}
                  size="small"
                  sx={{ bgcolor: res.bg, color: res.textColor, fontWeight: 800, fontSize: "0.68rem", height: 22 }}
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
