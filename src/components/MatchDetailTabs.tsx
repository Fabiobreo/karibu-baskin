"use client";

import { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Avatar,
  Chip,
  Stack,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import GroupsIcon from "@mui/icons-material/Groups";
import LockIcon from "@mui/icons-material/Lock";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import StarIcon from "@mui/icons-material/Star";
import Link from "next/link";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import MatchStatsTable from "@/components/MatchStatsTable";
import type { MatchStatRow } from "@/components/MatchStatsTable";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { StandingEntry } from "@/lib/standings";

interface CallupEntry {
  id: string;
  userId: string | null;
  childId: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    slug: string | null;
    sportRole: number | null;
    sportRoleVariant: string | null;
  } | null;
  child: {
    id: string;
    name: string;
    sportRole: number | null;
    sportRoleVariant: string | null;
  } | null;
}

interface PrevMatchPreview {
  id: string;
  slug: string | null;
  date: string;
  ourScore: number | null;
  theirScore: number | null;
  result: string | null;
  isHome: boolean;
}

interface Props {
  notes: string | null;
  stats: MatchStatRow[];
  callups: CallupEntry[];
  canSeeCallups: boolean;
  hasScore: boolean;
  prevMatches: PrevMatchPreview[];
  groupStandings: StandingEntry[] | null;
  ourTeamId: string;
  groupName: string | null;
  opponentName: string;
}

const RESULT_META: Record<string, { label: string; color: string }> = {
  WIN: { label: "Vittoria", color: "#2E7D32" },
  LOSS: { label: "Sconfitta", color: "#C62828" },
  DRAW: { label: "Pareggio", color: "#E65100" },
};

export default function MatchDetailTabs({
  notes,
  stats,
  callups,
  canSeeCallups,
  hasScore,
  prevMatches,
  groupStandings,
  groupName,
  opponentName,
}: Props) {
  const [tab, setTab] = useState(0);
  const hasStats = stats.length > 0;

  // Merge callups + stats per partite già giocate
  type CallupWithStat = CallupEntry & { stat: MatchStatRow | null };
  const callupsWithStats: CallupWithStat[] = callups.map((c) => ({
    ...c,
    stat:
      stats.find(
        (s) => (c.userId && s.user?.id === c.userId) || (c.childId && s.child?.id === c.childId)
      ) ?? null,
  }));

  // Separazione: convocati per ruolo vs non scesi in campo
  const byRole = new Map<number, CallupWithStat[]>();
  const noRole: CallupWithStat[] = [];
  const notPlayed: CallupWithStat[] = [];

  for (const c of callupsWithStats) {
    if (hasScore && !c.stat) {
      notPlayed.push(c);
      continue;
    }
    const role = (c.user ?? c.child)?.sportRole ?? null;
    if (!role) {
      noRole.push(c);
      continue;
    }
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role)!.push(c);
  }

  // Ordine per ruolo crescente; dentro ogni ruolo: punti decrescenti se giocata, altrimenti nome
  const sortedRoles = [1, 2, 3, 4, 5].filter((r) => byRole.has(r));
  for (const r of sortedRoles) {
    byRole
      .get(r)!
      .sort((a, b) =>
        hasScore && a.stat && b.stat
          ? b.stat.points - a.stat.points
          : ((a.user ?? a.child)?.name ?? "").localeCompare((b.user ?? b.child)?.name ?? "")
      );
  }
  notPlayed.sort((a, b) => {
    const ra = (a.user ?? a.child)?.sportRole ?? 99;
    const rb = (b.user ?? b.child)?.sportRole ?? 99;
    return ra !== rb
      ? ra - rb
      : ((a.user ?? a.child)?.name ?? "").localeCompare((b.user ?? b.child)?.name ?? "");
  });

  // Top 3 marcatori (già ordinati per punti desc dalla query)
  const top3 = stats.slice(0, 3);

  const hasContext =
    prevMatches.length > 0 || (groupStandings !== null && groupStandings.length > 0);

  return (
    <>
      {/* Tab bar */}
      <Box
        sx={{
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          bgcolor: "background.paper",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: { xs: 1, md: 0 } }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<GroupsIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={`Convocati${canSeeCallups && callups.length > 0 ? ` (${callups.length})` : ""}`}
            sx={{ minHeight: 48, fontSize: "0.82rem", fontWeight: 600 }}
          />
          <Tab
            icon={<LeaderboardIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={`Statistiche${hasStats ? ` (${stats.length})` : ""}`}
            sx={{ minHeight: 48, fontSize: "0.82rem", fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      {/* ── Tab 0 — Convocati ──────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box sx={{ pt: 3 }}>
          {/* Top 3 marcatori — visibili a tutti se la partita è giocata */}
          {hasScore && top3.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="caption"
                color="text.disabled"
                fontWeight={700}
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "block",
                  mb: 1.5,
                  fontSize: "0.62rem",
                }}
              >
                Top marcatori
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${top3.length}, 1fr)`,
                  gap: 1.5,
                }}
              >
                {top3.map((s, i) => {
                  const athlete = s.user ?? s.child;
                  const name = athlete?.name ?? "—";
                  const role = athlete?.sportRole ?? null;
                  const image = s.user?.image ?? null;
                  const slug = s.user?.slug ?? null;

                  const card = (
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        border: "1px solid rgba(0,0,0,0.07)",
                        textAlign: "center",
                        position: "relative",
                        transition: "box-shadow 0.15s",
                        ...(slug
                          ? { "&:hover": { boxShadow: "0 2px 10px rgba(0,0,0,0.08)" } }
                          : {}),
                      }}
                    >
                      {i === 0 && (
                        <StarIcon
                          sx={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            fontSize: 14,
                            color: "#FFB300",
                          }}
                        />
                      )}
                      <Avatar
                        src={image ?? undefined}
                        sx={{ width: 44, height: 44, fontSize: 16, mx: "auto", mb: 1 }}
                      >
                        {name[0]}
                      </Avatar>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        noWrap
                        sx={{ fontSize: "0.8rem" }}
                      >
                        {name}
                      </Typography>
                      {role && (
                        <Chip
                          label={sportRoleLabel(role, athlete?.sportRoleVariant ?? null)}
                          size="small"
                          sx={{
                            bgcolor: ROLE_COLORS[role],
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: "0.56rem",
                            height: 14,
                            mt: 0.5,
                          }}
                        />
                      )}
                      <Typography
                        sx={{
                          fontSize: "1.8rem",
                          fontWeight: 900,
                          color: "primary.main",
                          lineHeight: 1.1,
                          mt: 1,
                        }}
                      >
                        {s.points}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        fontWeight={600}
                        sx={{ fontSize: "0.62rem" }}
                      >
                        punti
                      </Typography>
                    </Paper>
                  );

                  return slug ? (
                    <Link key={s.id} href={`/giocatori/${slug}`} style={{ textDecoration: "none" }}>
                      {card}
                    </Link>
                  ) : (
                    <Box key={s.id}>{card}</Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Lista convocati (gated) */}
          {!canSeeCallups ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <LockIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1.5 }} />
              <Typography variant="h6" color="text.secondary" fontWeight={700}>
                Riservato ai membri
              </Typography>
              <Typography
                variant="body2"
                color="text.disabled"
                sx={{ mt: 0.5, mb: 2.5, maxWidth: 360, mx: "auto" }}
              >
                La lista dei convocati è visibile solo agli atleti, ai genitori e allo staff.
                Effettua l&apos;accesso per visualizzarla.
              </Typography>
              <Link href="/login" style={{ textDecoration: "none" }}>
                <Button variant="contained" color="primary" sx={{ fontWeight: 700 }}>
                  Accedi
                </Button>
              </Link>
            </Box>
          ) : callups.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <GroupsIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
              <Typography variant="h6" color="text.secondary" fontWeight={700}>
                Nessun convocato
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                La lista convocati non è ancora disponibile per questa partita.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              {sortedRoles.map((role) => {
                const list = byRole.get(role)!;
                return (
                  <Box key={role}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: ROLE_COLORS[role],
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          fontSize: "0.65rem",
                          color: "text.secondary",
                        }}
                      >
                        {`Ruolo ${role} · ${list.length} ${list.length === 1 ? "giocatore" : "giocatori"}`}
                      </Typography>
                    </Box>
                    <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
                      <Stack divider={<Divider />}>
                        {list.map((c) => (
                          <CallupRow key={c.id} c={c} hasScore={hasScore} />
                        ))}
                      </Stack>
                    </Paper>
                  </Box>
                );
              })}

              {noRole.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontSize: "0.65rem",
                      color: "text.disabled",
                      display: "block",
                      mb: 1,
                    }}
                  >
                    {`Ruolo non assegnato · ${noRole.length}`}
                  </Typography>
                  <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
                    <Stack divider={<Divider />}>
                      {noRole.map((c) => (
                        <CallupRow key={c.id} c={c} hasScore={hasScore} />
                      ))}
                    </Stack>
                  </Paper>
                </Box>
              )}

              {hasScore && notPlayed.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontSize: "0.65rem",
                      color: "text.disabled",
                      display: "block",
                      mb: 1,
                    }}
                  >
                    {`Non scesi in campo · ${notPlayed.length}`}
                  </Typography>
                  <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{ overflow: "hidden", opacity: 0.65 }}
                  >
                    <Stack divider={<Divider />}>
                      {notPlayed.map((c) => (
                        <CallupRow key={c.id} c={c} hasScore={false} />
                      ))}
                    </Stack>
                  </Paper>
                </Box>
              )}
            </Stack>
          )}

          {/* ── Sezione contesto ──────────────────────────────────────────── */}
          {hasContext && (
            <Box sx={{ mt: 5 }}>
              <Divider sx={{ mb: 4 }} />

              {prevMatches.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    fontWeight={700}
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      display: "block",
                      mb: 1.5,
                      fontSize: "0.62rem",
                    }}
                  >
                    Scontri diretti con {opponentName}
                  </Typography>
                  <Stack spacing={0.25}>
                    {prevMatches.map((m) => {
                      const score = m.ourScore !== null ? `${m.ourScore} – ${m.theirScore}` : "–";
                      const resMeta = m.result ? RESULT_META[m.result] : null;

                      const row = (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            px: 1.5,
                            py: 0.9,
                            borderRadius: 1,
                            ...(m.slug
                              ? { cursor: "pointer", "&:hover": { bgcolor: "rgba(0,0,0,0.03)" } }
                              : {}),
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ minWidth: 88, fontWeight: 600, fontSize: "0.72rem" }}
                          >
                            {format(new Date(m.date), "d MMM yyyy", { locale: it })}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={800}
                            sx={{ minWidth: 52, fontSize: "0.85rem" }}
                          >
                            {score}
                          </Typography>
                          {resMeta && (
                            <Chip
                              label={resMeta.label}
                              size="small"
                              sx={{
                                bgcolor: resMeta.color,
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: "0.62rem",
                                height: 18,
                              }}
                            />
                          )}
                          <Box
                            sx={{
                              ml: "auto",
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              color: "text.disabled",
                            }}
                          >
                            {m.isHome ? (
                              <HomeIcon sx={{ fontSize: 13 }} />
                            ) : (
                              <FlightIcon sx={{ fontSize: 13 }} />
                            )}
                            <Typography variant="caption" sx={{ fontSize: "0.68rem" }}>
                              {m.isHome ? "Casa" : "Trasferta"}
                            </Typography>
                          </Box>
                        </Box>
                      );

                      return m.slug ? (
                        <Link
                          key={m.id}
                          href={`/partite/${m.slug}`}
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          {row}
                        </Link>
                      ) : (
                        <Box key={m.id}>{row}</Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              {groupStandings && groupStandings.length > 0 && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      fontWeight={700}
                      sx={{
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontSize: "0.62rem",
                      }}
                    >
                      Classifica girone{groupName ? ` — ${groupName}` : ""}
                    </Typography>
                    <Link href="/classifiche" style={{ textDecoration: "none" }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "primary.main",
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        Vedi tutto
                      </Typography>
                    </Link>
                  </Box>
                  <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.65rem",
                              color: "text.disabled",
                              py: 0.75,
                              width: 28,
                            }}
                          >
                            #
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: "0.65rem", py: 0.75 }}>
                            Squadra
                          </TableCell>
                          {["G", "V", "P", "S"].map((h) => (
                            <TableCell
                              key={h}
                              align="center"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.65rem",
                                color: "text.disabled",
                                py: 0.75,
                                width: 28,
                              }}
                            >
                              {h}
                            </TableCell>
                          ))}
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.65rem",
                              color: "primary.main",
                              py: 0.75,
                              width: 36,
                            }}
                          >
                            Pt
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groupStandings.map((row, i) => (
                          <TableRow
                            key={row.id}
                            sx={{
                              bgcolor: row.isOurs ? "rgba(230,81,0,0.05)" : undefined,
                            }}
                          >
                            <TableCell
                              sx={{
                                fontSize: "0.75rem",
                                color: "text.disabled",
                                fontWeight: 700,
                                py: 1,
                              }}
                            >
                              {i + 1}
                            </TableCell>
                            <TableCell
                              sx={{ fontSize: "0.8rem", fontWeight: row.isOurs ? 800 : 500, py: 1 }}
                            >
                              {row.name}
                              {row.isOurs && (
                                <Box
                                  component="span"
                                  sx={{ ml: 0.5, fontSize: "0.55rem", color: "primary.main" }}
                                >
                                  ●
                                </Box>
                              )}
                            </TableCell>
                            {[row.played, row.won, row.drawn, row.lost].map((v, j) => (
                              <TableCell
                                key={j}
                                align="center"
                                sx={{ fontSize: "0.75rem", color: "text.secondary", py: 1 }}
                              >
                                {v}
                              </TableCell>
                            ))}
                            <TableCell
                              align="center"
                              sx={{
                                fontSize: "0.82rem",
                                fontWeight: 800,
                                color: "primary.main",
                                py: 1,
                              }}
                            >
                              {row.points}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* ── Tab 1 — Statistiche ─────────────────────────────────────────────── */}
      {tab === 1 && (
        <Box sx={{ pt: 3 }}>
          {!hasStats ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <LeaderboardIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
              <Typography variant="h6" color="text.secondary" fontWeight={700}>
                Nessuna statistica
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                Le statistiche non sono ancora disponibili per questa partita.
              </Typography>
            </Box>
          ) : (
            <MatchStatsTable stats={stats} />
          )}
        </Box>
      )}
    </>
  );
}

function CallupRow({
  c,
  hasScore,
}: {
  c: {
    id: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
      slug: string | null;
      sportRole: number | null;
      sportRoleVariant: string | null;
    } | null;
    child: {
      id: string;
      name: string;
      sportRole: number | null;
      sportRoleVariant: string | null;
    } | null;
    stat: MatchStatRow | null;
  };
  hasScore: boolean;
}) {
  const person = c.user ?? c.child;
  if (!person) return null;
  const name = person.name ?? "—";
  const variant = person.sportRoleVariant ?? null;
  const image = c.user?.image ?? null;
  const slug = c.user?.slug ?? null;

  const inner = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25 }}>
      <Avatar src={image ?? undefined} sx={{ width: 38, height: 38, fontSize: 14 }}>
        {name[0]}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {name}
        </Typography>
        {variant && (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
            {`var. ${variant}`}
          </Typography>
        )}
      </Box>
      {hasScore && c.stat !== null && (
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography
            sx={{ fontSize: "1.15rem", fontWeight: 900, color: "primary.main", lineHeight: 1 }}
          >
            {c.stat.points}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem" }}>
            pt
          </Typography>
        </Box>
      )}
    </Box>
  );

  return slug ? (
    <Link href={`/giocatori/${slug}`} style={{ textDecoration: "none", color: "inherit" }}>
      <Box
        sx={{
          cursor: "pointer",
          transition: "background 0.12s",
          "&:hover": { bgcolor: "rgba(0,0,0,0.02)" },
        }}
      >
        {inner}
      </Box>
    </Link>
  ) : (
    <Box>{inner}</Box>
  );
}
