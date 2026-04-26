import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import {
  Container, Box, Typography, Paper, Chip, Divider,
  Table, TableHead, TableBody, TableRow, TableCell,
} from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import GironeOurMatchRow from "@/components/GironeOurMatchRow";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Metadata } from "next";

export const revalidate = 3600;

type Params = { params: Promise<{ groupId: string }> };

// ── Tipi ────────────────────────────────────────────────────────────────────

type OurMatch = {
  id: string;
  slug: string | null;
  date: Date;
  matchday: number | null;
  isHome: boolean;
  ourScore: number | null;
  theirScore: number | null;
  result: string | null;
  opponent: { id: string; name: string; slug: string | null };
};

type GroupMatchRow = {
  id: string;
  date: Date | null;
  matchday: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
};

type StandingEntry = {
  id: string; name: string; isOurs: boolean;
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; points: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeStandings(
  ourTeam: { id: string; name: string },
  ourMatches: OurMatch[],
  groupMatches: GroupMatchRow[],
): StandingEntry[] {
  const map = new Map<string, StandingEntry>();

  function getOrCreate(id: string, name: string, isOurs: boolean): StandingEntry {
    if (!map.has(id)) map.set(id, { id, name, isOurs, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    return map.get(id)!;
  }

  function addResult(e: StandingEntry, gf: number, ga: number) {
    e.played++;
    e.goalsFor += gf;
    e.goalsAgainst += ga;
    if (gf > ga) { e.won++;  e.points += 2; }
    else if (gf === ga) { e.drawn++; e.points += 1; }
    else { e.lost++; }
  }

  for (const m of ourMatches) {
    if (m.ourScore == null || m.theirScore == null) continue;
    addResult(getOrCreate(ourTeam.id, ourTeam.name, true),    m.ourScore,   m.theirScore);
    addResult(getOrCreate(m.opponent.id, m.opponent.name, false), m.theirScore, m.ourScore);
  }

  for (const gm of groupMatches) {
    if (gm.homeScore == null || gm.awayScore == null) continue;
    addResult(getOrCreate(gm.homeTeam.id, gm.homeTeam.name, false), gm.homeScore, gm.awayScore);
    addResult(getOrCreate(gm.awayTeam.id, gm.awayTeam.name, false), gm.awayScore, gm.homeScore);
  }

  return Array.from(map.values()).sort((a, b) =>
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor
  );
}

// Un "evento" di calendario per la vista per giornata
type MatchEvent =
  | { kind: "ours"; data: OurMatch }
  | { kind: "external"; data: GroupMatchRow };

function groupByMatchday(
  ourMatches: OurMatch[],
  groupMatches: GroupMatchRow[],
): Map<number | null, MatchEvent[]> {
  const map = new Map<number | null, MatchEvent[]>();

  function push(day: number | null, ev: MatchEvent) {
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(ev);
  }

  for (const m of ourMatches)     push(m.matchday,  { kind: "ours",     data: m });
  for (const gm of groupMatches)  push(gm.matchday, { kind: "external", data: gm });

  return map;
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { groupId } = await params;
  const g = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true, season: true } });
  if (!g) return {};
  return { title: `${g.name} ${g.season} | Karibu Baskin` };
}

// ── Pagina ────────────────────────────────────────────────────────────────────

export default async function GironePage({ params }: Params) {
  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      team: { select: { id: true, name: true, color: true, season: true } },
      matches: {
        orderBy: [{ matchday: "asc" }, { date: "asc" }],
        select: {
          id: true, slug: true, date: true, matchday: true, isHome: true,
          ourScore: true, theirScore: true, result: true,
          opponent: { select: { id: true, name: true, slug: true } },
        },
      },
      groupMatches: {
        orderBy: [{ matchday: "asc" }, { date: "asc" }],
        select: {
          id: true, date: true, matchday: true, homeScore: true, awayScore: true,
          homeTeam: { select: { id: true, name: true } },
          awayTeam:  { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!group) notFound();

  const standings = computeStandings(group.team, group.matches, group.groupMatches);
  const byMatchday = groupByMatchday(group.matches, group.groupMatches);
  const matchdays = Array.from(byMatchday.keys()).sort((a, b) => (a ?? 999) - (b ?? 999));

  const RESULT_COLORS: Record<string, string> = { WIN: "#2E7D32", LOSS: "#C62828", DRAW: "#E65100" };
  const RESULT_LABELS: Record<string, string> = { WIN: "V", LOSS: "S", DRAW: "P" };

  return (
    <>
      <SiteHeader />
      <Container maxWidth="md" sx={{ py: 4 }}>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1, flexWrap: "wrap" }}>
            <Chip label={group.team.name} size="small" sx={{ bgcolor: group.team.color ?? "primary.main", color: "#fff", fontWeight: 700 }} />
            <Chip label={group.season} size="small" variant="outlined" />
            {group.championship && <Chip label={group.championship} size="small" variant="outlined" />}
          </Box>
          <Typography variant="h4" fontWeight={800}>{group.name}</Typography>
        </Box>

        {/* Classifica */}
        <Paper elevation={0} variant="outlined" sx={{ mb: 4, overflow: "hidden", borderRadius: 2 }}>
          <Box sx={{ px: 2.5, py: 1.5, display: "flex", alignItems: "center", gap: 1, bgcolor: "rgba(0,0,0,0.02)" }}>
            <EmojiEventsIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="subtitle2" fontWeight={700}>Classifica</Typography>
          </Box>
          <Divider />
          {standings.length === 0 ? (
            <Typography variant="body2" color="text.disabled" sx={{ p: 3, textAlign: "center" }}>
              Nessuna partita con risultato disponibile.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" } }}>
                  <TableCell sx={{ pl: 2, width: 32 }}>#</TableCell>
                  <TableCell>Squadra</TableCell>
                  <TableCell align="center">G</TableCell>
                  <TableCell align="center">V</TableCell>
                  <TableCell align="center">P</TableCell>
                  <TableCell align="center">S</TableCell>
                  <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>GF</TableCell>
                  <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>GS</TableCell>
                  <TableCell align="center" sx={{ color: "primary.main !important" }}>Pt</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {standings.map((s, i) => (
                  <TableRow
                    key={s.id}
                    sx={{ bgcolor: s.isOurs ? "primary.main" : undefined, "& td": s.isOurs ? { color: "#fff", fontWeight: 700 } : {} }}
                  >
                    <TableCell sx={{ pl: 2 }}>
                      <Typography variant="body2" color={s.isOurs ? "inherit" : "text.disabled"} fontWeight={600}>{i + 1}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={s.isOurs ? 800 : 600}>{s.name}</Typography>
                    </TableCell>
                    <TableCell align="center"><Typography variant="body2">{s.played}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{s.won}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{s.drawn}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2">{s.lost}</Typography></TableCell>
                    <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}><Typography variant="body2">{s.goalsFor}</Typography></TableCell>
                    <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}><Typography variant="body2">{s.goalsAgainst}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2" fontWeight={800}>{s.points}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* Calendario per giornata */}
        <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
          <Box sx={{ px: 2.5, py: 1.5, display: "flex", alignItems: "center", gap: 1, bgcolor: "rgba(0,0,0,0.02)" }}>
            <SportsSoccerIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="subtitle2" fontWeight={700}>Calendario</Typography>
          </Box>
          <Divider />

          {matchdays.length === 0 ? (
            <Typography variant="body2" color="text.disabled" sx={{ p: 3, textAlign: "center" }}>
              Nessuna partita inserita.
            </Typography>
          ) : (
            matchdays.map((day, idx) => {
              const events = byMatchday.get(day) ?? [];
              return (
                <Box key={day ?? "noday"}>
                  {idx > 0 && <Divider />}
                  <Box sx={{ px: 2.5, py: 1.25, bgcolor: "rgba(0,0,0,0.015)" }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {day != null ? `Giornata ${day}` : "Senza giornata"}
                    </Typography>
                  </Box>
                  <Table size="small">
                    <TableBody>
                      {events.map((ev) => {
                        if (ev.kind === "ours") {
                          const m = ev.data;
                          const home = m.isHome ? group.team.name : m.opponent.name;
                          const away = m.isHome ? m.opponent.name : group.team.name;
                          const homeScore = m.isHome ? m.ourScore : m.theirScore;
                          const awayScore = m.isHome ? m.theirScore : m.ourScore;
                          const href = `/partite/${m.slug ?? m.id}`;
                          return (
                            <GironeOurMatchRow key={m.id} href={href}>
                              <TableCell sx={{ width: 90, color: "text.secondary", fontSize: "0.75rem" }}>
                                {format(new Date(m.date), "d MMM", { locale: it })}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{home}</TableCell>
                              <TableCell align="center" sx={{ width: 70, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                                {homeScore !== null && awayScore !== null ? `${homeScore} – ${awayScore}` : "– – –"}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{away}</TableCell>
                              <TableCell sx={{ width: 40 }}>
                                {m.result && (
                                  <Chip label={RESULT_LABELS[m.result]} size="small"
                                    sx={{ bgcolor: RESULT_COLORS[m.result], color: "#fff", fontWeight: 700, height: 20, fontSize: "0.68rem" }}
                                  />
                                )}
                              </TableCell>
                            </GironeOurMatchRow>
                          );
                        } else {
                          const gm = ev.data;
                          return (
                            <TableRow key={gm.id}>
                              <TableCell sx={{ width: 90, color: "text.secondary", fontSize: "0.75rem" }}>
                                {gm.date ? format(new Date(gm.date), "d MMM", { locale: it }) : "—"}
                              </TableCell>
                              <TableCell>{gm.homeTeam.name}</TableCell>
                              <TableCell align="center" sx={{ width: 70, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                                {gm.homeScore !== null && gm.awayScore !== null ? `${gm.homeScore} – ${gm.awayScore}` : "– – –"}
                              </TableCell>
                              <TableCell>{gm.awayTeam.name}</TableCell>
                              <TableCell sx={{ width: 40 }} />
                            </TableRow>
                          );
                        }
                      })}
                    </TableBody>
                  </Table>
                </Box>
              );
            })
          )}
        </Paper>
      </Container>
    </>
  );
}
