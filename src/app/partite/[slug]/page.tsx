import { prisma } from "@/lib/db";
import {
  Container, Typography, Box, Paper, Chip,
  Divider, Stack,
} from "@mui/material";
import MatchStatsTable from "@/components/MatchStatsTable";
import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Metadata } from "next";
import type { MatchResult } from "@prisma/client";
import { slugify } from "@/lib/slugUtils";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import GroupsIcon from "@mui/icons-material/Groups";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

const RESULT_META: Record<MatchResult, { label: string; color: string; bg: string; gradient: string }> = {
  WIN:  { label: "Vittoria",  color: "#2E7D32", bg: "#E8F5E9", gradient: "linear-gradient(150deg, #1A2E1A 0%, #1B3A1B 60%, #1F4A1F 100%)" },
  LOSS: { label: "Sconfitta", color: "#C62828", bg: "#FFEBEE", gradient: "linear-gradient(150deg, #2E1A1A 0%, #3A1B1B 60%, #4A1F1F 100%)" },
  DRAW: { label: "Pareggio",  color: "#E65100", bg: "#FFF3E0", gradient: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)" },
};

const MATCH_TYPE_LABEL: Record<string, string> = {
  LEAGUE:     "Campionato",
  TOURNAMENT: "Torneo",
  FRIENDLY:   "Amichevole",
};

async function getMatch(slug: string) {
  // Prima prova per slug, poi per id (retrocompatibilità)
  const match = await prisma.match.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      team:     { select: { id: true, name: true, color: true, season: true, championship: true } },
      opponent: { select: { name: true, city: true } },
      group:    { select: { name: true, championship: true } },
      playerStats: {
        include: {
          user:  { select: { id: true, name: true, image: true, slug: true, sportRole: true, sportRoleVariant: true } },
          child: { select: { id: true, name: true, sportRole: true, sportRoleVariant: true } },
        },
        orderBy: { points: "desc" },
      },
      _count: { select: { playerStats: true } },
    },
  });
  return match;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const match = await getMatch(slug);
  if (!match) return { title: "Partita non trovata" };
  const score = match.ourScore !== null ? `${match.ourScore}–${match.theirScore}` : "vs";
  return {
    title: `${match.team.name} ${score} ${match.opponent.name} | Karibu Baskin`,
    description: `Dettaglio partita ${match.team.name} vs ${match.opponent.name} — ${format(new Date(match.date), "d MMMM yyyy", { locale: it })}`,
  };
}

export default async function MatchDetailPage({ params }: Props) {
  const { slug } = await params;
  const match = await getMatch(slug);
  if (!match) notFound();

  const meta      = match.result ? RESULT_META[match.result] : null;
  const heroBg    = meta?.gradient ?? "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)";
  const hasScore  = match.ourScore !== null && match.theirScore !== null;
  const hasStats  = match.playerStats.length > 0;

  const teamSeasonParam = match.team.season.replace("-", "");
  const teamSlug        = slugify(match.team.name);

  return (
    <>
      <SiteHeader />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <Box sx={{ background: heroBg, color: "#fff", pt: { xs: 4, md: 5 }, pb: { xs: 5, md: 7 }, px: 2, position: "relative", overflow: "hidden" }}>
        {/* sfere decorative */}
        <Box sx={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.02)", pointerEvents: "none" }} />

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          
          {/* Contenuto centrato */}
          <Box sx={{ textAlign: "center" }}>

          {/* Team + championship */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
            <Link href={`/squadre/${teamSeasonParam}/${teamSlug}`} style={{ textDecoration: "none" }}>
              <Chip
                label={match.team.name}
                size="small"
                sx={{ bgcolor: match.team.color ?? "#E65100", color: "#fff", fontWeight: 700, cursor: "pointer", "&:hover": { opacity: 0.85 } }}
              />
            </Link>
            {match.group?.name && (
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                {match.group.name}
              </Typography>
            )}
            <Chip
              label={MATCH_TYPE_LABEL[match.matchType]}
              size="small"
              variant="outlined"
              sx={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)", fontSize: "0.68rem" }}
            />
          </Box>

          {/* Score block */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: { xs: 3, md: 6 }, mb: 3 }}>
            {/* Noi */}
            <Box sx={{ textAlign: "center", minWidth: 100 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, display: "block", mb: 0.5 }}>
                Karibu
              </Typography>
              <Typography sx={{ fontSize: { xs: "3.5rem", md: "5rem" }, fontWeight: 900, lineHeight: 1, color: "#fff" }}>
                {hasScore ? match.ourScore : "–"}
              </Typography>
            </Box>

            {/* Vs / result */}
            <Box sx={{ textAlign: "center", flex: "0 0 auto" }}>
              {meta ? (
                <Chip
                  label={meta.label}
                  sx={{ bgcolor: meta.color, color: "#fff", fontWeight: 800, fontSize: "0.85rem", height: 32, px: 1 }}
                />
              ) : (
                <Typography sx={{ color: "rgba(255,255,255,0.3)", fontWeight: 700, fontSize: "1.4rem" }}>vs</Typography>
              )}
            </Box>

            {/* Avversario */}
            <Box sx={{ textAlign: "center", minWidth: 100 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, display: "block", mb: 0.5 }}>
                {match.opponent.name}
              </Typography>
              <Typography sx={{ fontSize: { xs: "3.5rem", md: "5rem" }, fontWeight: 900, lineHeight: 1, color: "rgba(255,255,255,0.55)" }}>
                {hasScore ? match.theirScore : "–"}
              </Typography>
            </Box>
          </Box>

          {/* Data e luogo */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "rgba(255,255,255,0.5)" }}>
              <CalendarTodayIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" fontWeight={600}>
                {format(new Date(match.date), "EEEE d MMMM yyyy · HH:mm", { locale: it })}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "rgba(255,255,255,0.5)" }}>
              {match.isHome ? <HomeIcon sx={{ fontSize: 14 }} /> : <FlightIcon sx={{ fontSize: 14 }} />}
              <Typography variant="caption" fontWeight={600}>
                {match.isHome ? "Casa" : "Trasferta"}
              </Typography>
            </Box>
            {match.venue && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "rgba(255,255,255,0.5)" }}>
                <PlaceIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption" fontWeight={600}>{match.venue}</Typography>
              </Box>
            )}
          </Box>
          </Box>{/* fine Box centrato */}
        </Container>
      </Box>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>

        {/* Info cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
            gap: 1.5,
            mb: 5,
          }}
        >
          {[
            {
              icon: <EmojiEventsIcon sx={{ fontSize: 20, color: "primary.main" }} />,
              label: "Competizione",
              value: match.team.championship ?? MATCH_TYPE_LABEL[match.matchType],
            },
            {
              icon: <CalendarTodayIcon sx={{ fontSize: 20, color: "primary.main" }} />,
              label: "Stagione",
              value: match.team.season,
            },
            {
              icon: match.isHome
                ? <HomeIcon sx={{ fontSize: 20, color: "primary.main" }} />
                : <FlightIcon sx={{ fontSize: 20, color: "primary.main" }} />,
              label: "Campo",
              value: match.isHome ? "Casa" : "Trasferta",
            },
            {
              icon: <GroupsIcon sx={{ fontSize: 20, color: "primary.main" }} />,
              label: "Girone",
              value: match.group?.name ?? "—",
            },
          ].map((info) => (
            <Paper
              key={info.label}
              elevation={0}
              sx={{ p: 2, border: "1px solid rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 0.5 }}
            >
              {info.icon}
              <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.6rem" }}>
                {info.label}
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem", lineHeight: 1.3 }}>
                {info.value}
              </Typography>
            </Paper>
          ))}
        </Box>

        {match.notes && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 4,
              border: "1px solid rgba(0,0,0,0.07)",
              borderLeft: "4px solid",
              borderLeftColor: "primary.main",
              bgcolor: "rgba(230,81,0,0.03)",
            }}
          >
            <Typography
              variant="caption"
              color="text.disabled"
              fontWeight={700}
              sx={{ textTransform: "uppercase", letterSpacing: "0.08em", display: "block", mb: 0.75, fontSize: "0.62rem" }}
            >
              Note
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: "italic", lineHeight: 1.6, whiteSpace: "pre-line" }}>
              {match.notes}
            </Typography>
          </Paper>
        )}

        {/* Stats */}
        {hasStats ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                Statistiche
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
              Marcatori
            </Typography>
            <MatchStatsTable stats={match.playerStats} />
          </>
        ) : (
          match.result && (
            <Paper elevation={0} variant="outlined" sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.disabled">
                Nessuna statistica individuale disponibile per questa partita.
              </Typography>
            </Paper>
          )
        )}

      </Container>
    </>
  );
}
