"use client";

import { useState } from "react";
import { Box, Tabs, Tab, Paper, Typography, Avatar, Chip, Stack, Divider } from "@mui/material";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import GroupsIcon from "@mui/icons-material/Groups";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import Link from "next/link";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import MatchStatsTable from "@/components/MatchStatsTable";
import type { MatchStatRow } from "@/components/MatchStatsTable";

interface CalloupsEntry {
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

interface InfoCard {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}

interface Props {
  infoCards: InfoCard[];
  notes: string | null;
  stats: MatchStatRow[];
  callups: CalloupsEntry[];
  matchType: string;
}

export default function MatchDetailTabs({ infoCards, notes, stats, callups, matchType }: Props) {
  const [tab, setTab] = useState(0);

  const hasStats = stats.length > 0;
  const hasCallups = callups.length > 0;

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
            icon={<InfoOutlinedIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label="Dettaglio"
            sx={{ minHeight: 48, fontSize: "0.82rem", fontWeight: 600 }}
          />
          <Tab
            icon={<GroupsIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={`Convocati${hasCallups ? ` (${callups.length})` : ""}`}
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

      {/* Tab 0 — Dettaglio */}
      {tab === 0 && (
        <Box sx={{ pt: 3 }}>
          {/* Info cards */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
              gap: 1.5,
              mb: notes ? 4 : 0,
            }}
          >
            {infoCards.map((info) =>
              info.href ? (
                <Link key={info.label} href={info.href} style={{ textDecoration: "none" }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      border: "1px solid rgba(0,0,0,0.07)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                      cursor: "pointer",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                      "&:hover": {
                        borderColor: "primary.main",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      },
                    }}
                  >
                    {info.icon}
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      fontWeight={700}
                      sx={{
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontSize: "0.6rem",
                      }}
                    >
                      {info.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="primary.main"
                      sx={{ fontSize: "0.82rem", lineHeight: 1.3 }}
                    >
                      {info.value}
                    </Typography>
                  </Paper>
                </Link>
              ) : (
                <Paper
                  key={info.label}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "1px solid rgba(0,0,0,0.07)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                  }}
                >
                  {info.icon}
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    fontWeight={700}
                    sx={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.6rem" }}
                  >
                    {info.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ fontSize: "0.82rem", lineHeight: 1.3 }}
                  >
                    {info.value}
                  </Typography>
                </Paper>
              )
            )}
          </Box>

          {notes && (
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mt: notes && infoCards.length ? 4 : 0,
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
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "block",
                  mb: 0.75,
                  fontSize: "0.62rem",
                }}
              >
                Note
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontStyle: "italic", lineHeight: 1.6, whiteSpace: "pre-line" }}
              >
                {notes}
              </Typography>
            </Paper>
          )}

          {!notes && (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <InfoOutlinedIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
              <Typography variant="body2" color="text.disabled">
                Nessuna nota per questa partita.
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Tab 1 — Convocati */}
      {tab === 1 && (
        <Box sx={{ pt: 3 }}>
          {!hasCallups ? (
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
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Chip
                  label={`${callups.length} convocati`}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
                <Stack divider={<Divider />}>
                  {callups.map((c) => {
                    const person = c.user ?? c.child;
                    if (!person) return null;
                    const name = person.name ?? "—";
                    const role = person.sportRole;
                    const variant = (person as { sportRoleVariant?: string | null })
                      .sportRoleVariant;
                    const image = c.user?.image ?? null;
                    const slug = c.user?.slug ?? null;

                    const inner = (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          px: 2,
                          py: 1.25,
                        }}
                      >
                        <Avatar
                          src={image ?? undefined}
                          sx={{ width: 36, height: 36, fontSize: 14 }}
                        >
                          {name[0]}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {name}
                          </Typography>
                          {role && (
                            <Chip
                              label={sportRoleLabel(role, variant ?? null)}
                              size="small"
                              sx={{
                                bgcolor: ROLE_COLORS[role],
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: "0.58rem",
                                height: 14,
                                mt: 0.25,
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    );

                    return slug ? (
                      <Link
                        key={c.id}
                        href={`/giocatori/${slug}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
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
                      <Box key={c.id}>{inner}</Box>
                    );
                  })}
                </Stack>
              </Paper>
            </>
          )}
        </Box>
      )}

      {/* Tab 2 — Statistiche */}
      {tab === 2 && (
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
