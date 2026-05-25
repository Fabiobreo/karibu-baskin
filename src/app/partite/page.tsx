import { prisma } from "@/lib/db";
import { Container, Typography, Box, Paper, Chip, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SiteHeader from "@/components/SiteHeader";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import BoltIcon from "@mui/icons-material/Bolt";
import PlaceIcon from "@mui/icons-material/Place";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Metadata } from "next";
import type { MatchType } from "@prisma/client";
import { getCurrentSeason } from "@/lib/seasonUtils";

export const metadata: Metadata = {
  title: "Prossime partite | Karibu Baskin",
  description:
    "Calendario delle prossime partite ufficiali del Karibu Baskin di Montecchio Maggiore.",
};

export const revalidate = 3600;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  LEAGUE: "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY: "Amichevole",
};

const IMMINENT_HOURS = 48;

function relativeLabel(date: Date, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Domani";
  if (diffDays > 1 && diffDays <= 6) {
    return format(date, "EEEE", { locale: it }).replace(/^./, (c) => c.toUpperCase());
  }
  return `Tra ${diffDays} giorni`;
}

export default async function PartitePage({ searchParams }: Props) {
  const sp = await searchParams;
  const season = sp.season ?? getCurrentSeason();
  const now = new Date();
  const imminentLimit = new Date(now.getTime() + IMMINENT_HOURS * 60 * 60 * 1000);

  const allSeasons = await prisma.competitiveTeam.findMany({
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "desc" },
  });
  const seasons = allSeasons.map((s) => s.season);

  const upcoming = await prisma.match.findMany({
    where: { result: null, date: { gte: now }, team: { season } },
    orderBy: { date: "asc" },
    select: {
      id: true,
      slug: true,
      date: true,
      isHome: true,
      matchType: true,
      venue: true,
      team: { select: { id: true, name: true, color: true, championship: true } },
      opponent: { select: { id: true, name: true, city: true } },
      opponentTeam: { select: { id: true, name: true } },
    },
  });

  // Raggruppa per squadra
  const teamMap = new Map<
    string,
    {
      id: string;
      name: string;
      color: string | null;
      championship: string | null;
      matches: typeof upcoming;
    }
  >();
  for (const m of upcoming) {
    if (!teamMap.has(m.team.id)) {
      teamMap.set(m.team.id, { ...m.team, matches: [] });
    }
    teamMap.get(m.team.id)!.matches.push(m);
  }
  const teamGroups = Array.from(teamMap.values());

  return (
    <>
      <SiteHeader />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #4A2A0A 55%, #E65100 130%)",
          color: "#fff",
          py: { xs: 5, md: 7 },
          px: 2,
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <CalendarTodayIcon sx={{ fontSize: 30, color: "#fff" }} />
            <Typography
              variant="overline"
              sx={{ color: "rgba(255,255,255,0.85)", letterSpacing: "0.12em", fontWeight: 700 }}
            >
              In programma
            </Typography>
          </Box>
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ mb: 1, fontSize: { xs: "1.9rem", md: "2.6rem" } }}
          >
            Prossime partite
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
            {upcoming.length === 0
              ? "Nessuna partita in programma."
              : `${upcoming.length} ${upcoming.length === 1 ? "partita" : "partite"} da disputare`}
          </Typography>
        </Container>
      </Box>

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
              Stagione:
            </Typography>
            {seasons.map((s) => (
              <Link
                key={s}
                href={`/partite?season=${encodeURIComponent(s)}`}
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

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {teamGroups.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <CalendarTodayIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nessuna partita in programma
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Il calendario delle prossime partite sarà pubblicato a breve.
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Link href="/risultati" style={{ textDecoration: "none" }}>
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{ fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
                >
                  Vedi i risultati →
                </Typography>
              </Link>
            </Box>
          </Box>
        )}

        {/* ── Sezioni per squadra ─────────────────────────────────────────── */}
        <Stack spacing={5}>
          {teamGroups.map((team) => (
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
                    bgcolor: team.color ?? "#E65100",
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
                <Chip
                  label={`${team.matches.length} ${team.matches.length === 1 ? "partita" : "partite"}`}
                  size="small"
                  sx={{
                    ml: "auto",
                    fontWeight: 700,
                    fontSize: "0.68rem",
                    height: 20,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                  }}
                />
              </Box>

              <Stack spacing={1}>
                {team.matches.map((m) => {
                  const isImminent = m.date <= imminentLimit;
                  const opponentName = m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario";
                  const leftName = m.isHome ? m.team.name : opponentName;
                  const rightName = m.isHome ? opponentName : m.team.name;
                  const leftIsUs = m.isHome;
                  return (
                    <Link
                      key={m.id}
                      href={`/partite/${m.slug ?? m.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderLeft: `4px solid ${team.color ?? "#E65100"}`,
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "box-shadow 0.15s, border-color 0.15s",
                          "&:hover": {
                            boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                            borderColor: "rgba(0,0,0,0.15)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            px: 2,
                            py: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flexWrap: "wrap",
                          }}
                        >
                          {/* Quando */}
                          <Box sx={{ minWidth: 110, flexShrink: 0 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <Typography
                                variant="body2"
                                fontWeight={800}
                                sx={{ fontSize: "0.85rem" }}
                              >
                                {relativeLabel(m.date, now)}
                              </Typography>
                              {isImminent && (
                                <Chip
                                  icon={<BoltIcon sx={{ fontSize: 12 }} />}
                                  label="Imminente"
                                  size="small"
                                  sx={{
                                    fontWeight: 800,
                                    fontSize: "0.6rem",
                                    height: 18,
                                    bgcolor: "primary.main",
                                    color: "#fff",
                                    "& .MuiChip-icon": { ml: "4px", mr: "-4px" },
                                  }}
                                />
                              )}
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{ fontSize: "0.68rem", display: "block" }}
                            >
                              {format(new Date(m.date), "d MMM · HH:mm", { locale: it })}
                            </Typography>
                          </Box>

                          {/* Match-up */}
                          <Box
                            sx={{
                              flex: 1,
                              minWidth: 200,
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
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
                            <Typography
                              sx={{
                                color: "text.disabled",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                px: 0.5,
                              }}
                            >
                              vs
                            </Typography>
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

                          {/* Casa/Trasferta + venue */}
                          <Box
                            sx={{
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Chip
                              icon={m.isHome ? <HomeIcon /> : <FlightIcon />}
                              label={m.isHome ? "Casa" : "Trasferta"}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "0.65rem", height: 22 }}
                            />
                            {m.venue && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.3,
                                  color: "text.disabled",
                                  maxWidth: 160,
                                }}
                              >
                                <PlaceIcon sx={{ fontSize: 12 }} />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: "0.65rem",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {m.venue}
                                </Typography>
                              </Box>
                            )}
                            <Chip
                              label={MATCH_TYPE_LABEL[m.matchType]}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: "0.6rem",
                                height: 20,
                                color: "text.secondary",
                                borderColor: "rgba(0,0,0,0.12)",
                              }}
                            />
                            <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                          </Box>
                        </Box>
                      </Paper>
                    </Link>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>

        {/* Link a risultati */}
        {teamGroups.length > 0 && (
          <Box sx={{ textAlign: "right", mt: 4 }}>
            <Link href="/risultati" style={{ textDecoration: "none" }}>
              <Typography
                variant="body2"
                color="primary"
                sx={{ fontWeight: 700, "&:hover": { textDecoration: "underline" } }}
              >
                Vedi i risultati →
              </Typography>
            </Link>
          </Box>
        )}
      </Container>
    </>
  );
}
