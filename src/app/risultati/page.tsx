import { prisma } from "@/lib/db";
import {
  Container, Typography, Box, Paper, Chip, Stack, Grid2 as Grid,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
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

const RESULT_COLOR: Record<MatchResult, string> = {
  WIN: "#2E7D32",
  LOSS: "#C62828",
  DRAW: "#E65100",
};
const RESULT_LABEL: Record<MatchResult, string> = {
  WIN: "Vittoria",
  LOSS: "Sconfitta",
  DRAW: "Pareggio",
};
const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function RisultatiPage({ searchParams }: Props) {
  const sp = await searchParams;
  const seasonFilter = sp.season ?? null;
  const teamFilter = sp.team ?? null;

  const matches = await prisma.match.findMany({
    where: {
      result: { not: null },
      ...(seasonFilter ? { team: { season: seasonFilter } } : {}),
      ...(teamFilter ? { teamId: teamFilter } : {}),
    },
    orderBy: { date: "desc" },
    include: {
      team: { select: { id: true, name: true, season: true, color: true, championship: true } },
      opponent: { select: { id: true, name: true, city: true } },
      _count: { select: { playerStats: true } },
    },
  });

  const allSeasons = await prisma.competitiveTeam.findMany({
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "desc" },
  });
  const seasons = allSeasons.map((s) => s.season);

  const allTeams = await prisma.competitiveTeam.findMany({
    select: { id: true, name: true, season: true, color: true },
    orderBy: [{ season: "desc" }, { name: "asc" }],
  });

  const now = new Date();
  const currentSeason = (() => {
    const y = now.getFullYear();
    const s = now.getMonth() >= 8 ? y : y - 1;
    return `${s}-${String(s + 1).slice(-2)}`;
  })();

  // Statistiche aggregate per il filtro attuale
  const wins = matches.filter((m) => m.result === "WIN").length;
  const losses = matches.filter((m) => m.result === "LOSS").length;
  const draws = matches.filter((m) => m.result === "DRAW").length;

  return (
    <>
      <SiteHeader />

      {/* Hero */}
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
              <Chip label={`${wins} vittorie`} size="small" sx={{ bgcolor: "#2E7D32", color: "#fff", fontWeight: 700 }} />
              <Chip label={`${draws} pareggi`} size="small" sx={{ bgcolor: "#E65100", color: "#fff", fontWeight: 700 }} />
              <Chip label={`${losses} sconfitte`} size="small" sx={{ bgcolor: "#C62828", color: "#fff", fontWeight: 700 }} />
            </Box>
          )}
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {/* Filtri */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4 }}>
          <Link href="/risultati" style={{ textDecoration: "none" }}>
            <Chip
              label="Tutte le stagioni"
              variant={!seasonFilter ? "filled" : "outlined"}
              color={!seasonFilter ? "primary" : "default"}
              sx={{ cursor: "pointer", fontWeight: 600 }}
            />
          </Link>
          {seasons.map((s) => (
            <Link key={s} href={`/risultati?season=${encodeURIComponent(s)}`} style={{ textDecoration: "none" }}>
              <Chip
                label={`Stagione ${s}`}
                variant={seasonFilter === s ? "filled" : "outlined"}
                color={seasonFilter === s ? "primary" : "default"}
                sx={{ cursor: "pointer", fontWeight: 600 }}
              />
            </Link>
          ))}
        </Box>

        {matches.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nessun risultato disponibile
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              I risultati verranno pubblicati al termine delle partite.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {matches.map((m) => (
              <Paper
                key={m.id}
                elevation={0}
                sx={{ border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}
              >
                <Box sx={{ display: "flex", alignItems: "stretch" }}>
                  <Box
                    sx={{
                      width: 6,
                      flexShrink: 0,
                      backgroundColor: m.result ? RESULT_COLOR[m.result] : "rgba(0,0,0,0.08)",
                    }}
                  />
                  <Box sx={{ flex: 1, p: 2 }}>
                    <Grid container spacing={1} alignItems="center">
                      {/* Data e tipo */}
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {format(new Date(m.date), "d MMM yyyy", { locale: it })}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                          {m.isHome
                            ? <HomeIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                            : <FlightIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                          }
                          <Typography variant="caption" color="text.disabled">
                            {m.isHome ? "Casa" : "Trasferta"} · {MATCH_TYPE_LABEL[m.matchType]}
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Squadra nostra */}
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Box>
                          <Link href={`/squadre/${m.team.season}/${m.team.name.toLowerCase().replace(/\s+/g, "-")}`} style={{ textDecoration: "none" }}>
                            <Chip
                              label={m.team.name}
                              size="small"
                              sx={{ bgcolor: m.team.color ?? "#E65100", color: "#fff", fontWeight: 700, fontSize: "0.68rem", cursor: "pointer" }}
                            />
                          </Link>
                          <Typography variant="caption" color="text.disabled" display="block">
                            {m.team.season}
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Avversario + punteggio */}
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="body2" fontWeight={600}>{m.opponent.name}</Typography>
                        {m.opponent.city && (
                          <Typography variant="caption" color="text.secondary">{m.opponent.city}</Typography>
                        )}
                        {m.ourScore !== null && m.theirScore !== null && (
                          <Typography variant="body2" fontWeight={800} sx={{ mt: 0.5 }}>
                            {m.ourScore} – {m.theirScore}
                          </Typography>
                        )}
                      </Grid>

                      {/* Esito */}
                      <Grid size={{ xs: 12, sm: 3 }} sx={{ textAlign: { xs: "left", sm: "right" } }}>
                        {m.result && (
                          <Chip
                            label={RESULT_LABEL[m.result]}
                            size="small"
                            sx={{ bgcolor: RESULT_COLOR[m.result], color: "#fff", fontWeight: 700 }}
                          />
                        )}
                        {m.team.championship && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {m.team.championship}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Partite future / senza risultato */}
        {!seasonFilter && (
          <Box sx={{ mt: 5 }}>
            <UpcomingMatches currentSeason={currentSeason} />
          </Box>
        )}
      </Container>
    </>
  );
}

async function UpcomingMatches({ currentSeason }: { currentSeason: string }) {
  const upcoming = await prisma.match.findMany({
    where: {
      result: null,
      date: { gte: new Date() },
      team: { season: currentSeason },
    },
    orderBy: { date: "asc" },
    take: 5,
    include: {
      team: { select: { name: true, color: true, season: true } },
      opponent: { select: { name: true, city: true } },
    },
  });

  if (upcoming.length === 0) return null;

  return (
    <>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Prossime partite
      </Typography>
      <Stack spacing={1}>
        {upcoming.map((m) => (
          <Paper key={m.id} elevation={0} sx={{ p: 2, border: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Box>
              <Typography variant="body2" fontWeight={700}>
                {format(new Date(m.date), "EEEE d MMMM yyyy · HH:mm", { locale: it })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {m.team.name} vs <strong>{m.opponent.name}</strong>
                {m.opponent.city ? ` (${m.opponent.city})` : ""}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {m.isHome
                ? <Chip label="Casa" size="small" variant="outlined" icon={<HomeIcon />} sx={{ fontSize: "0.65rem" }} />
                : <Chip label="Trasferta" size="small" variant="outlined" icon={<FlightIcon />} sx={{ fontSize: "0.65rem" }} />
              }
            </Box>
          </Paper>
        ))}
      </Stack>
    </>
  );
}
