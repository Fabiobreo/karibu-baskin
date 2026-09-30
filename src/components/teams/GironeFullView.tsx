"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { slugify } from "@/lib/slugUtils";
import { teamColor, teamFill } from "@/lib/teamColors";
import TeamColorDot from "@/components/teams/TeamColorDot";
import StatAbbr from "@/components/teams/StatAbbr";
import type { StandingEntry } from "@/lib/season/standings";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export type OurMatchData = {
  id: string;
  slug: string | null;
  date: string;
  matchday: number | null;
  isHome: boolean;
  ourScore: number | null;
  theirScore: number | null;
  result: string | null;
  teamId: string;
  opponent: { id: string; name: string; slug: string | null } | null;
};

export type GironeOurTeam = { id: string; name: string; color: string | null; season: string };

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
  ourTeams: GironeOurTeam[];
  season: string;
  standings: StandingEntry[];
  matchdays: MatchdayBucket[];
}

// Token del tema: i valori vivono in `palette.match` (vedi src/theme.ts).
// Cifre a larghezza fissa: senza, le colonne numeriche non si incolonnano.
const NUMERIC_CELL = { fontVariantNumeric: "tabular-nums" } as const;

const RESULT_COLORS: Record<string, string> = {
  WIN: "match.win",
  LOSS: "match.loss",
  DRAW: "match.draw",
};

function bucketHasPlayed(b: MatchdayBucket): boolean {
  return (
    b.ours.some((m) => m.ourScore != null && m.theirScore != null) ||
    b.external.some((m) => m.homeScore != null && m.awayScore != null)
  );
}

export default function GironeFullView({
  groupName,
  championship,
  ourTeams,
  season,
  standings,
  matchdays,
}: Props) {
  const t = useTranslations("standings");
  const tMatches = useTranslations("matches");
  const dateLocale = useActiveDateLocale();
  const RESULT_LABELS: Record<string, string> = {
    WIN: tMatches("resultWinShort"),
    LOSS: tMatches("resultLossShort"),
    DRAW: tMatches("resultDrawShort"),
  };
  // Per esteso: nome accessibile dei chip e legenda sotto il calendario (UX-24).
  const RESULT_FULL: Record<string, string> = {
    WIN: tMatches("resultWin"),
    LOSS: tMatches("resultLoss"),
    DRAW: tMatches("resultDraw"),
  };
  const router = useRouter();
  const seasonParam = season.replace("-", "");
  const teamById = useMemo(() => new Map(ourTeams.map((tm) => [tm.id, tm] as const)), [ourTeams]);
  const fallbackTeamName = ourTeams[0]?.name ?? t("ourTeam");

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
    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden", borderRadius: RADIUS.lg }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          bgcolor: "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
          flexWrap: "wrap",
        }}
      >
        {ourTeams.map((t) => {
          // Tinta squadra come riempimento; senza tinta chip contornato neutro.
          const fill = teamFill(t.color);
          const tint = fill?.bg ?? null;
          return (
            <Chip
              key={t.id}
              label={t.name}
              size="small"
              variant={tint ? "filled" : "outlined"}
              sx={fill ? { bgcolor: fill.bg, color: fill.fg } : undefined}
            />
          );
        })}
        <Typography variant="subtitle2">{groupName}</Typography>
        {championship && (
          <Chip
            label={championship}
            size="small"
            variant="outlined"
            sx={{ fontSize: TYPE_SCALE.xs }}
          />
        )}
      </Box>

      {/* Classifica */}
      <Box sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 0.75 }}>
        <EmojiEventsIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: TYPE_SCALE.xs }}>
          {t("classification")}
        </Typography>
      </Box>
      {standings.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
          {t("noResults")}
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    fontWeight: FONT_WEIGHT.semibold,
                    fontSize: TYPE_SCALE.xs,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "text.secondary",
                  },
                }}
              >
                <TableCell sx={{ pl: 2, width: 28 }}>#</TableCell>
                <TableCell>{t("colTeam")}</TableCell>
                {(["colPlayed", "colWins", "colDraws", "colLosses"] as const).map((key) => (
                  <TableCell key={key} align="center">
                    <StatAbbr short={t(key)} full={t(`${key}Full`)} />
                  </TableCell>
                ))}
                {(["colPointsFor", "colPointsAgainst"] as const).map((key) => (
                  <TableCell
                    key={key}
                    align="center"
                    sx={{ display: { xs: "none", sm: "table-cell" } }}
                  >
                    <StatAbbr short={t(key)} full={t(`${key}Full`)} />
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  // Il token va risolto qui: `sx` non lo risolve piu' quando la
                  // stringa porta anche `!important`, e la regola veniva scartata.
                  sx={(theme) => ({ color: `${theme.palette.text.primary} !important` })}
                >
                  <StatAbbr short={t("colPoints")} full={t("colPointsFull")} />
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
                      // Nostra riga (UX-29): fondo neutro selezionato, grassetto e
                      // pallino squadra; niente arancio (vuol dire "si tocca").
                      bgcolor: s.isOurs ? "action.selected" : undefined,
                      "& td": s.isOurs
                        ? { color: "text.primary", fontWeight: FONT_WEIGHT.semibold }
                        : {},
                    }}
                  >
                    <TableCell sx={{ pl: 2 }}>
                      <Typography
                        variant="body2"
                        color={s.isOurs ? "inherit" : "text.secondary"}
                        fontWeight={FONT_WEIGHT.semibold}
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
                            fontWeight={FONT_WEIGHT.semibold}
                            sx={{ "&:hover": { textDecoration: "underline" } }}
                          >
                            <TeamColorDot color={teamById.get(s.id)?.color} size={8} />
                            {s.name}
                          </Typography>
                        </Link>
                      ) : (
                        <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                          {s.name}
                        </Typography>
                      )}
                    </TableCell>
                    {[s.played, s.won, s.drawn, s.lost].map((v, j) => (
                      <TableCell key={j} align="center" sx={NUMERIC_CELL}>
                        <Typography variant="body2">{v}</Typography>
                      </TableCell>
                    ))}
                    {[s.goalsFor, s.goalsAgainst].map((v, j) => (
                      <TableCell
                        key={j}
                        align="center"
                        sx={{ ...NUMERIC_CELL, display: { xs: "none", sm: "table-cell" } }}
                      >
                        <Typography variant="body2">{v}</Typography>
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={NUMERIC_CELL}>
                      <Typography variant="body2" fontWeight={FONT_WEIGHT.bold}>
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
        <SportsSoccerIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: TYPE_SCALE.xs }}>
          {t("calendarSection")}
        </Typography>
      </Box>

      {matchdays.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
          {t("noMatches")}
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
              borderBottom: "1px solid",
              borderColor: "divider",
              "& .MuiTab-root": {
                minHeight: 36,
                fontSize: TYPE_SCALE.xs,
                fontWeight: FONT_WEIGHT.semibold,
                textTransform: "none",
                py: 0.5,
              },
            }}
          >
            {matchdays.map((b, i) => (
              <Tab
                key={`${b.matchday ?? "none"}-${i}`}
                label={b.matchday != null ? t("matchdayShort", { n: b.matchday }) : "—"}
              />
            ))}
          </Tabs>

          {current && (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableBody>
                  {current.ours.map((m) => {
                    const opponentNameLocal = m.opponent?.name ?? t("opponent");
                    const ourName = teamById.get(m.teamId)?.name ?? fallbackTeamName;
                    const home = m.isHome ? ourName : opponentNameLocal;
                    const away = m.isHome ? opponentNameLocal : ourName;
                    const homeScore = m.isHome ? m.ourScore : m.theirScore;
                    const awayScore = m.isHome ? m.theirScore : m.ourScore;
                    const href = `/partite/${m.slug ?? m.id}`;
                    return (
                      <TableRow
                        key={m.id}
                        hover
                        onClick={() => router.push(href)}
                        sx={{
                          cursor: "pointer",
                          bgcolor: "action.hover",
                        }}
                      >
                        <TableCell
                          sx={{ width: 80, color: "text.secondary", fontSize: TYPE_SCALE.xs }}
                        >
                          {format(new Date(m.date), "d MMM", { locale: dateLocale })}
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: FONT_WEIGHT.semibold, fontSize: TYPE_SCALE.xs }}
                        >
                          {home}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            width: 90,
                            fontWeight: FONT_WEIGHT.bold,
                            fontSize: TYPE_SCALE.sm,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {homeScore !== null && awayScore !== null
                            ? `${homeScore} – ${awayScore}`
                            : "– – –"}
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: FONT_WEIGHT.semibold, fontSize: TYPE_SCALE.xs }}
                        >
                          {away}
                        </TableCell>
                        <TableCell sx={{ width: 36 }}>
                          {m.result && (
                            <Chip
                              label={RESULT_LABELS[m.result]}
                              aria-label={RESULT_FULL[m.result]}
                              title={RESULT_FULL[m.result]}
                              size="small"
                              sx={{
                                bgcolor: RESULT_COLORS[m.result],
                                color: "match.onFill",
                                height: 20,
                                fontSize: TYPE_SCALE.xs,
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ width: 24, pr: 1 }}>
                          <ChevronRightIcon
                            sx={{ fontSize: 16, color: "text.secondary", display: "block" }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {current.external.map((gm) => (
                    <TableRow key={gm.id}>
                      <TableCell
                        sx={{ width: 80, color: "text.secondary", fontSize: TYPE_SCALE.xs }}
                      >
                        {gm.date ? format(new Date(gm.date), "d MMM", { locale: dateLocale }) : "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: TYPE_SCALE.xs }}>{gm.homeTeam.name}</TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          width: 90,
                          fontWeight: FONT_WEIGHT.semibold,
                          fontSize: TYPE_SCALE.xs,
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {gm.homeScore !== null && gm.awayScore !== null
                          ? `${gm.homeScore} – ${gm.awayScore}`
                          : "– – –"}
                      </TableCell>
                      <TableCell sx={{ fontSize: TYPE_SCALE.xs }}>{gm.awayTeam.name}</TableCell>
                      <TableCell sx={{ width: 36 }} />
                      <TableCell sx={{ width: 24, pr: 1 }} />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography
                variant="caption"
                color="text.secondary"
                component="p"
                sx={{ px: 2, py: 1 }}
              >
                {(["WIN", "DRAW", "LOSS"] as const)
                  .map((r) => `${RESULT_LABELS[r]} = ${RESULT_FULL[r]}`)
                  .join(" · ")}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
