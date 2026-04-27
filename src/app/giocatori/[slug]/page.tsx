import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Box, Container, Typography, Grid2 as Grid, Paper, Chip, Avatar, Stack, Divider,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GroupsIcon from "@mui/icons-material/Groups";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ROLE_LABELS, ROLE_COLORS, GENDER_LABELS, sportRoleLabel } from "@/lib/constants";
import { slugify } from "@/lib/slugUtils";
import type { Metadata } from "next";
import type { MatchResult } from "@prisma/client";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Cerca per slug, poi per ID (retrocompatibilità)
  const user = await prisma.user.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { name: true },
  });
  if (!user) return { title: "Giocatore non trovato" };
  const title = `${user.name ?? "Giocatore"} | Karibu Baskin`;
  const description = `Profilo di ${user.name ?? "atleta"} del Karibu Baskin di Montecchio Maggiore: statistiche, squadre e partite.`;
  const url = `https://karibu-baskin.vercel.app/giocatori/${slug}`;
  return {
    title,
    description,
    openGraph: { title, description, url, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

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

export default async function PlayerProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const seasonFilter = sp.season ?? null; // es. "2025-26"

  // Cerca per slug (es. "mario-rossi"), con fallback su ID (per link esistenti)
  const user = await prisma.user.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      id: true,
      name: true,
      image: true,
      sportRole: true,
      sportRoleVariant: true,
      gender: true,
      birthDate: true,
      createdAt: true,
      appRole: true,
      teamMemberships: {
        orderBy: { createdAt: "desc" },
        include: {
          team: { select: { id: true, name: true, season: true, color: true, championship: true } },
        },
      },
      matchStats: {
        orderBy: { match: { date: "desc" } },
        include: {
          match: {
            include: {
              team: { select: { id: true, name: true, color: true, season: true } },
              opponent: { select: { id: true, name: true, city: true } },
            },
          },
        },
      },
      _count: { select: { registrations: true } },
    },
  });

  if (!user || user.appRole === "GUEST") notFound();

  // Stagione sportiva corrente (es. "2025-26") — settembre o dopo = nuova stagione
  const now = new Date();
  const currentSeason = (() => {
    const y = now.getFullYear();
    const start = now.getMonth() >= 8 ? y : y - 1;
    return `${start}-${String(start + 1).slice(-2)}`;
  })();
  const currentTeams = user.teamMemberships.filter((m) => m.team.season === currentSeason);

  // Stagioni disponibili per il filtro (da matchStats e teamMemberships)
  const seasons = Array.from(new Set([
    ...user.matchStats.map((ms) => ms.match.team.season),
    ...user.teamMemberships.map((m) => m.team.season),
  ])).sort().reverse();

  // Filtro stagione per le statistiche
  const filteredStats = seasonFilter
    ? user.matchStats.filter((ms) => ms.match.team.season === seasonFilter)
    : user.matchStats;

  // Aggregazioni statistiche
  const totalPoints = filteredStats.reduce((s, ms) => s + ms.points, 0);
  const totalBaskets = filteredStats.reduce((s, ms) => s + ms.baskets, 0);
  const totalFouls = filteredStats.reduce((s, ms) => s + ms.fouls, 0);
  const totalAssists = filteredStats.reduce((s, ms) => s + ms.assists, 0);
  const totalRebounds = filteredStats.reduce((s, ms) => s + ms.rebounds, 0);
  const matchesPlayed = filteredStats.length;

  const hasStats = matchesPlayed > 0;

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          py: { xs: 6, md: 8 },
          px: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.1)", pointerEvents: "none" }} />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
            <Avatar
              src={user.image ?? undefined}
              sx={{ width: 80, height: 80, fontSize: 28, border: "3px solid rgba(230,81,0,0.5)" }}
            >
              {(user.name ?? "?")[0].toUpperCase()}
            </Avatar>
            <Box>
              <Chip label="Giocatore" color="primary" size="small" sx={{ mb: 1, fontWeight: 700 }} />
              <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5, fontSize: { xs: "1.8rem", md: "2.5rem" } }}>
                {user.name ?? "—"}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
                {user.sportRole && (
                  <Chip
                    label={sportRoleLabel(user.sportRole, user.sportRoleVariant ?? null)}
                    size="small"
                    sx={{ bgcolor: ROLE_COLORS[user.sportRole], color: "#fff", fontWeight: 700 }}
                  />
                )}
                {currentTeams.map((m) => (
                  <Chip
                    key={m.id}
                    icon={m.isCaptain ? <EmojiEventsIcon sx={{ fontSize: "0.9rem !important", color: "#F9A825 !important" }} /> : undefined}
                    label={m.team.name}
                    size="small"
                    sx={{
                      bgcolor: m.team.color ? `${m.team.color}33` : "rgba(255,255,255,0.15)",
                      color: "#fff",
                      border: "1px solid",
                      borderColor: m.team.color ?? "rgba(255,255,255,0.4)",
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>

        {/* Info atleta */}
        <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 5 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Dati atleta
          </Typography>
          <Grid container spacing={2}>
            {user.gender && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="Genere" value={GENDER_LABELS[user.gender]} />
              </Grid>
            )}
            {user.birthDate && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  label="Data di nascita"
                  value={format(new Date(user.birthDate), "d MMMM yyyy", { locale: it })}
                />
              </Grid>
            )}
            {user.sportRole && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  label="Ruolo Baskin"
                  value={
                    <Chip
                      label={ROLE_LABELS[user.sportRole as keyof typeof ROLE_LABELS]}
                      size="small"
                      sx={{ bgcolor: ROLE_COLORS[user.sportRole], color: "#fff", fontWeight: 700 }}
                    />
                  }
                />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoRow label="Allenamenti" value={`${user._count.registrations}`} />
            </Grid>
          </Grid>
        </Paper>

        {/* Statistiche agonistiche */}
        {hasStats && (
          <>
            <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mt: 0.5, mb: 3 }}>
              <Box>
                <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                  Statistiche
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  Agonismo
                </Typography>
              </Box>
              {seasons.length > 1 && (
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  <Link href={`/giocatori/${slug}`} style={{ textDecoration: "none" }}>
                    <Chip label="Tutto" size="small" variant={!seasonFilter ? "filled" : "outlined"} color={!seasonFilter ? "primary" : "default"} sx={{ cursor: "pointer", fontWeight: 600 }} />
                  </Link>
                  {seasons.map((s) => (
                    <Link key={s} href={`/giocatori/${slug}?season=${encodeURIComponent(s)}`} style={{ textDecoration: "none" }}>
                      <Chip label={`Stagione ${s}`} size="small" variant={seasonFilter === s ? "filled" : "outlined"} color={seasonFilter === s ? "primary" : "default"} sx={{ cursor: "pointer", fontWeight: 600 }} />
                    </Link>
                  ))}
                </Box>
              )}
            </Box>
            <Grid container spacing={2} sx={{ mb: 5 }}>
              {[
                { label: "Partite", value: matchesPlayed, color: "#1565C0" },
                { label: "Punti totali", value: totalPoints, color: "#E65100" },
                { label: "Canestri", value: totalBaskets, color: "#2E7D32" },
                { label: "Assist", value: totalAssists, color: "#7B1FA2" },
                { label: "Rimbalzi", value: totalRebounds, color: "#00838F" },
                { label: "Falli", value: totalFouls, color: "#C62828" },
                { label: "Media punti", value: matchesPlayed > 0 ? (totalPoints / matchesPlayed).toFixed(1) : "—", color: "#1A1A1A" },
                { label: "Media canestri", value: matchesPlayed > 0 ? (totalBaskets / matchesPlayed).toFixed(1) : "—", color: "#555" },
              ].map((s) => (
                <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2 }}>
                  <Paper elevation={0} sx={{ p: 2, textAlign: "center", border: "1px solid rgba(0,0,0,0.07)" }}>
                    <Typography variant="h4" fontWeight={800} sx={{ color: s.color, fontSize: { xs: "1.6rem", md: "1.8rem" } }}>
                      {s.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      {s.label}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Squadre */}
        {user.teamMemberships.length > 0 && (
          <>
            <Divider sx={{ mb: 5 }} />
            <Box sx={{ mb: 5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <GroupsIcon color="primary" />
                <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                  Squadre
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>
                Storico agonistico
              </Typography>
              <Stack spacing={1.5}>
                {user.teamMemberships.map((m) => (
                  <Link key={m.id} href={`/squadre/${m.team.season}/${slugify(m.team.name)}`} style={{ textDecoration: "none" }}>
                    <Paper
                      elevation={0}
                      sx={{
                        border: "1px solid rgba(0,0,0,0.07)",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "stretch",
                        cursor: "pointer",
                        transition: "all 0.12s",
                        "&:hover": { transform: "translateX(4px)", boxShadow: 2 },
                      }}
                    >
                      <Box sx={{ width: 6, flexShrink: 0, backgroundColor: m.team.color ?? "#E65100" }} />
                      <Box sx={{ flex: 1, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="body2" fontWeight={700}>{m.team.name}</Typography>
                            {m.isCaptain && (
                              <EmojiEventsIcon sx={{ fontSize: 14, color: "#F9A825" }} />
                            )}
                          </Box>
                          {m.team.championship && (
                            <Typography variant="caption" color="text.secondary">{m.team.championship}</Typography>
                          )}
                        </Box>
                        <Chip
                          label={`Stagione ${m.team.season}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                        />
                      </Box>
                    </Paper>
                  </Link>
                ))}
              </Stack>
            </Box>
          </>
        )}

        {/* Partite giocate con statistiche */}
        {filteredStats.length > 0 && (
          <>
            <Divider sx={{ mb: 5 }} />
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <SportsSoccerIcon color="primary" />
                <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                  Partite
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>
                Statistiche per partita
              </Typography>
              <Stack spacing={1.5}>
                {filteredStats.map((ms) => (
                  <Link key={ms.id} href={`/partite/${ms.match.slug ?? ms.match.id}`} style={{ textDecoration: "none" }}>
                    <Paper
                      elevation={0}
                      sx={{
                        border: "1px solid rgba(0,0,0,0.07)",
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "box-shadow 0.12s, transform 0.12s",
                        "&:hover": { boxShadow: 2, transform: "translateX(3px)" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "stretch" }}>
                        <Box
                          sx={{
                            width: 6,
                            flexShrink: 0,
                            backgroundColor: ms.match.result ? RESULT_COLOR[ms.match.result] : "rgba(0,0,0,0.08)",
                          }}
                        />
                        <Box sx={{ flex: 1, p: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
                            <Box>
                              <Typography variant="body2" fontWeight={700}>
                                {ms.match.team.name} vs {ms.match.opponent.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(ms.match.date), "d MMMM yyyy", { locale: it })}
                                {ms.match.ourScore !== null && ms.match.theirScore !== null
                                  ? `  ·  ${ms.match.ourScore} – ${ms.match.theirScore}`
                                  : ""}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              {ms.match.result && (
                                <Chip
                                  label={RESULT_LABEL[ms.match.result]}
                                  size="small"
                                  sx={{ backgroundColor: RESULT_COLOR[ms.match.result], color: "#fff", fontWeight: 700, fontSize: "0.7rem" }}
                                />
                              )}
                              <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                            </Box>
                          </Box>
                          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            <StatItem label="Punti" value={ms.points} />
                            <StatItem label="Canestri" value={ms.baskets} />
                            {ms.assists > 0 && <StatItem label="Assist" value={ms.assists} />}
                            {ms.rebounds > 0 && <StatItem label="Rimbalzi" value={ms.rebounds} />}
                            <StatItem label="Falli" value={ms.fouls} />
                          </Box>
                          {ms.notes && (
                            <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1 }}>
                              {ms.notes}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Link>
                ))}
              </Stack>
            </Box>
          </>
        )}

        {user.teamMemberships.length === 0 && !hasStats && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <SportsSoccerIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nessuna statistica disponibile
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Le statistiche agonistiche verranno pubblicate al termine delle partite.
            </Typography>
          </Box>
        )}
      </Container>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {typeof value === "string"
        ? <Typography variant="body2" fontWeight={600}>{value}</Typography>
        : value}
    </Box>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1 }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Typography>
    </Box>
  );
}
