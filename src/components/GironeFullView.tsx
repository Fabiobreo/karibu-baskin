"use client";

import { useMemo, useState } from "react";
import {
  Paper,
  Box,
  Typography,
  Chip,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { slugify } from "@/lib/slugUtils";
import type { StandingEntry } from "@/lib/standings";

export type OurMatchData = {
  id: string;
  slug: string | null;
  date: string;
  matchday: number | null;
  isHome: boolean;
  ourScore: number | null;
  theirScore: number | null;
  result: string | null;
  opponent: { id: string; name: string; slug: string | null } | null;
};

export type ExternalMatchData = {
  id: string;
  date: string | null;
  matchday: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
};

export type MatchdayBucket = {
  matchday: number | null;
  ours: OurMatchData[];
  external: ExternalMatchData[];
};

interface Props {
  groupName: string;
  championship: string | null;
  teamName: string;
  teamColor: string | null;
  teamSeason: string;
  standings: StandingEntry[];
  matchdays: MatchdayBucket[];
}

const RESULT_COLORS: Record<string, string> = {
  WIN: "#2E7D32",
  LOSS: "#C62828",
  DRAW: "#E65100",
};
const RESULT_LABELS: Record<string, string> = { WIN: "V", LOSS: "S", DRAW: "P" };

function bucketHasPlayed(b: MatchdayBucket): boolean {
  return (
    b.ours.some((m) => m.ourScore != null && m.theirScore != null) ||
    b.external.some((m) => m.homeScore != null && m.awayScore != null)
  );
}

export default function GironeFullView({
  groupName,
  championship,
  teamName,
  teamColor,
  teamSeason,
  standings,
  matchdays,
}: Props) {
  const router = useRouter();
  const seasonParam = teamSeason.replace("-", "");

  const defaultIndex = useMemo(() => {
    if (matchdays.length === 0) return 0;
    // Ultima giornata con almeno una partita giocata; altrimenti la prima.
    for (let i = matchdays.length - 1; i >= 0; i--) {
      if (bucketHasPlayed(matchdays[i])) return i;
    }
    return 0;
  }, [matchdays]);

  const [tab, setTab] = useState(defaultIndex);
  const current = matchdays[tab];

  return (
    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          bgcolor: "rgba(0,0,0,0.03)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          flexWrap: "wrap",
        }}
      >
        <Chip
          label={teamName}
          size="small"
          sx={{ bgcolor: teamColor ?? "primary.main", color: "#fff", fontWeight: 700 }}
        />
        <Typography variant="subtitle2" fontWeight={700}>
          {groupName}
        </Typography>
        {championship && (
          <Chip label={championship} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
        )}
      </Box>

      {/* Classifica */}
      <Box sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 0.75 }}>
        <EmojiEventsIcon sx={{ fontSize: 16, color: "primary.main" }} />
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={700}
          sx={{ letterSpacing: "0.08em", fontSize: "0.7rem" }}
        >
          Classifica
        </Typography>
      </Box>
      {standings.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ px: 2, pb: 2 }}>
          Nessuna partita con risultato disponibile.
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "text.secondary",
                  },
                }}
              >
                <TableCell sx={{ pl: 2, width: 28 }}>#</TableCell>
                <TableCell>Squadra</TableCell>
                <TableCell align="center">G</TableCell>
                <TableCell align="center">V</TableCell>
                <TableCell align="center">P</TableCell>
                <TableCell align="center">S</TableCell>
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  PF
                </TableCell>
                <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  PS
                </TableCell>
                <TableCell align="center" sx={{ color: "primary.main !important" }}>
                  Pt
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {standings.map((s, i) => {
                const teamSlug = slugify(s.name);
                return (
                  <TableRow
                    key={s.id}
                    sx={{
                      bgcolor: s.isOurs ? "primary.main" : undefined,
                      "& td": s.isOurs ? { color: "#fff", fontWeight: 700 } : {},
                    }}
                  >
                    <TableCell sx={{ pl: 2 }}>
                      <Typography
                        variant="body2"
                        color={s.isOurs ? "inherit" : "text.disabled"}
                        fontWeight={600}
                      >
                        {i + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {s.isOurs ? (
                        <Link
                          href={`/squadre/${seasonParam}/${teamSlug}`}
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={800}
                            sx={{ "&:hover": { textDecoration: "underline" } }}
                          >
                            {s.name}
                          </Typography>
                        </Link>
                      ) : (
                        <Typography variant="body2" fontWeight={600}>
                          {s.name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{s.played}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{s.won}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{s.drawn}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{s.lost}</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      <Typography variant="body2">{s.goalsFor}</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      <Typography variant="body2">{s.goalsAgainst}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={800}>
                        {s.points}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Calendario per giornata */}
      <Divider />
      <Box sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 0.75 }}>
        <SportsSoccerIcon sx={{ fontSize: 16, color: "primary.main" }} />
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={700}
          sx={{ letterSpacing: "0.08em", fontSize: "0.7rem" }}
        >
          Calendario
        </Typography>
      </Box>

      {matchdays.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ px: 2, pb: 2 }}>
          Nessuna partita inserita.
        </Typography>
      ) : (
        <>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              borderBottom: "1px solid rgba(0,0,0,0.07)",
              "& .MuiTab-root": {
                minHeight: 36,
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "none",
                py: 0.5,
              },
            }}
          >
            {matchdays.map((b, i) => (
              <Tab
                key={`${b.matchday ?? "none"}-${i}`}
                label={b.matchday != null ? `G${b.matchday}` : "—"}
              />
            ))}
          </Tabs>

          {current && (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableBody>
                  {current.ours.map((m) => {
                    const opponentNameLocal = m.opponent?.name ?? "Avversario";
                    const home = m.isHome ? teamName : opponentNameLocal;
                    const away = m.isHome ? opponentNameLocal : teamName;
                    const homeScore = m.isHome ? m.ourScore : m.theirScore;
                    const awayScore = m.isHome ? m.theirScore : m.ourScore;
                    const href = `/partite/${m.slug ?? m.id}`;
                    return (
                      <TableRow
                        key={m.id}
                        hover
                        onClick={() => router.push(href)}
                        sx={{ cursor: "pointer", bgcolor: "rgba(230,81,0,0.04)" }}
                      >
                        <TableCell sx={{ width: 80, color: "text.secondary", fontSize: "0.72rem" }}>
                          {format(new Date(m.date), "d MMM", { locale: it })}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem" }}>{home}</TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            width: 90,
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {homeScore !== null && awayScore !== null
                            ? `${homeScore} – ${awayScore}`
                            : "– – –"}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem" }}>{away}</TableCell>
                        <TableCell sx={{ width: 36 }}>
                          {m.result && (
                            <Chip
                              label={RESULT_LABELS[m.result]}
                              size="small"
                              sx={{
                                bgcolor: RESULT_COLORS[m.result],
                                color: "#fff",
                                fontWeight: 700,
                                height: 18,
                                fontSize: "0.65rem",
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ width: 24, pr: 1 }}>
                          <ChevronRightIcon
                            sx={{ fontSize: 16, color: "text.disabled", display: "block" }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {current.external.map((gm) => (
                    <TableRow key={gm.id}>
                      <TableCell sx={{ width: 80, color: "text.secondary", fontSize: "0.72rem" }}>
                        {gm.date ? format(new Date(gm.date), "d MMM", { locale: it }) : "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8rem" }}>{gm.homeTeam.name}</TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          width: 90,
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {gm.homeScore !== null && gm.awayScore !== null
                          ? `${gm.homeScore} – ${gm.awayScore}`
                          : "– – –"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8rem" }}>{gm.awayTeam.name}</TableCell>
                      <TableCell sx={{ width: 36 }} />
                      <TableCell sx={{ width: 24, pr: 1 }} />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
