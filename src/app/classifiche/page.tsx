import { prisma } from "@/lib/db";
import {
  Container, Typography, Box, Paper, Chip, Stack, Divider,
  Table, TableHead, TableBody, TableRow, TableCell,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import Link from "next/link";
import type { Metadata } from "next";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import ClassificaInternaTable from "@/components/ClassificaInternaTable";
import type { PlayerStatRow } from "@/components/ClassificaInternaTable";

export const metadata: Metadata = {
  title: "Classifiche | Karibu Baskin",
  description: "Classifiche campionato e marcatori del Karibu Baskin di Montecchio Maggiore.",
};

export const revalidate = 3600;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

const RESULT_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  WIN:  { label: "V", color: "#2E7D32", bg: "#E8F5E9" },
  DRAW: { label: "P", color: "#E65100", bg: "#FFF3E0" },
  LOSS: { label: "S", color: "#C62828", bg: "#FFEBEE" },
};

export default async function ClassifichePage({ searchParams }: Props) {
  const sp = await searchParams;
  const seasonFilter = sp.season ?? null;

  const now = new Date();
  const defaultSeason = (() => {
    const y = now.getFullYear();
    const s = now.getMonth() >= 8 ? y : y - 1;
    return `${s}-${String(s + 1).slice(-2)}`;
  })();
  const activeSeason = seasonFilter ?? defaultSeason;

  const [groups, seasons, allStats] = await Promise.all([
    prisma.group.findMany({
      where: { season: activeSeason },
      include: {
        team: { select: { id: true, name: true, color: true } },
        matches: {
          where: { result: { not: null } },
          select: {
            id: true, date: true, result: true, ourScore: true, theirScore: true, isHome: true,
            opponent: { select: { name: true } },
          },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.group.findMany({
      select: { season: true },
      distinct: ["season"],
      orderBy: { season: "desc" },
    }),
    prisma.playerMatchStats.groupBy({
      by: ["userId"],
      where: {
        userId: { not: null },
        match: { team: { season: activeSeason } },
      },
      _sum: { points: true, baskets: true, assists: true, rebounds: true, fouls: true },
      _count: { matchId: true },
    }),
  ]);

  const userIds = allStats.map((s) => s.userId!).filter(Boolean);
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, image: true, slug: true, sportRole: true, sportRoleVariant: true },
      })
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const statRows: PlayerStatRow[] = allStats
    .filter((s) => s.userId && userMap[s.userId])
    .map((s) => ({
      userId: s.userId!,
      name: userMap[s.userId!].name,
      image: userMap[s.userId!].image,
      slug: userMap[s.userId!].slug,
      sportRole: userMap[s.userId!].sportRole,
      sportRoleVariant: userMap[s.userId!].sportRoleVariant,
      matches: s._count.matchId,
      points: s._sum.points ?? 0,
      baskets: s._sum.baskets ?? 0,
      assists: s._sum.assists ?? 0,
      rebounds: s._sum.rebounds ?? 0,
      fouls: s._sum.fouls ?? 0,
    }));

  const availableSeasons = seasons.map((s) => s.season);
  const hasData = groups.length > 0 || statRows.length > 0;

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
            <LeaderboardIcon sx={{ fontSize: 32, color: "primary.main" }} />
            <Typography variant="overline" color="primary.main" fontWeight={700} sx={{ letterSpacing: "0.12em" }}>
              Classifiche
            </Typography>
          </Box>
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: "1.9rem", md: "2.6rem" } }}>
            Stagione {activeSeason}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {/* Filtri stagione */}
        {availableSeasons.length > 1 && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4 }}>
            {availableSeasons.map((s) => (
              <Link key={s} href={`/classifiche?season=${encodeURIComponent(s)}`} style={{ textDecoration: "none" }}>
                <Chip
                  label={`Stagione ${s}`}
                  variant={activeSeason === s ? "filled" : "outlined"}
                  color={activeSeason === s ? "primary" : "default"}
                  sx={{ cursor: "pointer", fontWeight: 600 }}
                />
              </Link>
            ))}
          </Box>
        )}

        {/* Classifica campionato per girone */}
        {groups.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <EmojiEventsIcon color="primary" />
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                Campionato
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>Record per girone</Typography>

            <Stack spacing={2}>
              {groups.map((g) => {
                const played = g.matches.length;
                const wins = g.matches.filter((m) => m.result === "WIN").length;
                const draws = g.matches.filter((m) => m.result === "DRAW").length;
                const losses = g.matches.filter((m) => m.result === "LOSS").length;
                const points = wins * 2 + draws;
                const pf = g.matches.reduce((s, m) => s + (m.ourScore ?? 0), 0);
                const pa = g.matches.reduce((s, m) => s + (m.theirScore ?? 0), 0);

                return (
                  <Paper key={g.id} elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
                    {/* Header */}
                    <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5, bgcolor: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                      <Chip label={g.team.name} size="small" sx={{ bgcolor: g.team.color ?? "#E65100", color: "#fff", fontWeight: 700 }} />
                      <Typography variant="subtitle2" fontWeight={700}>{g.name}</Typography>
                      {g.championship && (
                        <Typography variant="caption" color="text.secondary">({g.championship})</Typography>
                      )}
                    </Box>

                    {played === 0 ? (
                      <Box sx={{ px: 2, py: 2 }}>
                        <Typography variant="body2" color="text.disabled">Nessuna partita giocata in questo girone.</Typography>
                      </Box>
                    ) : (
                      <>
                        {/* Record complessivo */}
                        <Box sx={{ overflowX: "auto" }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                {["G", "V", "P", "S", "PF", "PS", "Pt"].map((h, i) => (
                                  <TableCell
                                    key={h}
                                    align={i === 0 ? "left" : "center"}
                                    sx={{ fontWeight: 700, fontSize: "0.72rem", color: h === "Pt" ? "primary.main" : undefined }}
                                  >
                                    {h}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>{played}</TableCell>
                                <TableCell align="center" sx={{ color: "#2E7D32", fontWeight: 700 }}>{wins}</TableCell>
                                <TableCell align="center" sx={{ color: "#E65100", fontWeight: 600 }}>{draws}</TableCell>
                                <TableCell align="center" sx={{ color: "#C62828", fontWeight: 600 }}>{losses}</TableCell>
                                <TableCell align="center">{pf}</TableCell>
                                <TableCell align="center">{pa}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: "primary.main", fontSize: "1rem" }}>{points}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Box>

                        {/* Lista partite del girone */}
                        <Divider />
                        <Box sx={{ overflowX: "auto" }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Data</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Avversario</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>C/T</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Risultato</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Punteggio</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {g.matches.map((m) => {
                                const res = m.result ? RESULT_LABEL[m.result] : null;
                                return (
                                  <TableRow key={m.id} hover>
                                    <TableCell sx={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                                      {format(new Date(m.date), "d MMM yy", { locale: it })}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600 }}>
                                      {m.opponent.name}
                                    </TableCell>
                                    <TableCell align="center">
                                      <Typography variant="caption" color="text.secondary">
                                        {m.isHome ? "C" : "T"}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      {res && (
                                        <Chip
                                          label={res.label}
                                          size="small"
                                          sx={{ bgcolor: res.bg, color: res.color, fontWeight: 800, height: 20, fontSize: "0.7rem" }}
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
                                      {m.ourScore ?? "–"} – {m.theirScore ?? "–"}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </Box>
                      </>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Classifica interna */}
        {statRows.length > 0 && (
          <>
            {groups.length > 0 && <Divider sx={{ mb: 5 }} />}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <LeaderboardIcon color="primary" />
              <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: "0.1em" }}>
                Marcatori
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>Classifica interna</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Clicca sull&apos;intestazione di una colonna per ordinare.
            </Typography>
            <ClassificaInternaTable rows={statRows} />
          </>
        )}

        {!hasData && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <LeaderboardIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Nessun dato disponibile per la stagione {activeSeason}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Le classifiche verranno aggiornate con l&apos;avanzare della stagione.
            </Typography>
          </Box>
        )}
      </Container>
    </>
  );
}
