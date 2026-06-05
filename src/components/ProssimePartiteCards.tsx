"use client";
import Link from "next/link";
import { Box, Typography, Paper, Chip, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import BoltIcon from "@mui/icons-material/Bolt";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";

export interface MatchCardData {
  id: string;
  slug: string | null;
  date: Date;
  isHome: boolean;
  venue: string | null;
  isImminent: boolean;
  team: { id: string; name: string; color: string | null };
  opponent: { id: string; name: string } | null;
  opponentTeam: { id: string; name: string } | null;
}

function relativeLabel(
  date: Date,
  now: Date,
  tCommon: ReturnType<typeof useTranslations>,
  dateLocale: Locale
): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays === 0) return tCommon("today");
  if (diffDays === 1) return tCommon("tomorrow");
  if (diffDays > 1 && diffDays <= 6) {
    return format(date, "EEEE", { locale: dateLocale }).replace(/^./, (c) => c.toUpperCase());
  }
  return tCommon("daysAway", { count: diffDays });
}

interface ProssimePartiteCardsProps {
  matches: MatchCardData[];
}

export default function ProssimePartiteCards({ matches }: ProssimePartiteCardsProps) {
  const now = new Date();
  const tCommon = useTranslations("common");
  const tMatches = useTranslations("matches");
  const dateLocale = useActiveDateLocale();

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      alignItems="stretch"
      sx={{ "& > *": { flex: 1 } }}
    >
      {matches.map((m, idx) => {
        const highlight = idx === 0 && m.isImminent;
        return (
          <Link
            key={m.id}
            href={m.slug ? `/partite/${m.slug}` : `/partite`}
            style={{ textDecoration: "none", display: "block" }}
          >
            <Paper
              elevation={highlight ? 6 : 2}
              sx={{
                p: { xs: 2, md: 2.5 },
                height: "100%",
                position: "relative",
                overflow: "hidden",
                border: highlight ? "2px solid" : "1px solid",
                borderColor: highlight ? "primary.main" : "divider",
                transition: "all 0.18s",
                cursor: "pointer",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: 8,
                },
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 6,
                  backgroundColor: m.team.color,
                }}
              />
              <Box sx={{ pl: 1.5 }}>
                {m.isImminent && (
                  <Chip
                    icon={<BoltIcon sx={{ fontSize: 16 }} />}
                    label={tMatches("imminent")}
                    size="small"
                    sx={(theme) => ({
                      mb: 1,
                      fontWeight: 700,
                      bgcolor: "primary.main",
                      color: "#fff",
                      animation: "karibuPulse 1.6s ease-in-out infinite",
                      "@keyframes karibuPulse": {
                        "0%, 100%": {
                          boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.5)}`,
                        },
                        "50%": {
                          boxShadow: `0 0 0 6px ${alpha(theme.palette.primary.main, 0)}`,
                        },
                      },
                    })}
                  />
                )}
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{
                    color: "text.primary",
                    lineHeight: 1.1,
                    fontSize: { xs: "1.05rem", md: "1.15rem" },
                  }}
                >
                  {relativeLabel(m.date, now, tCommon, dateLocale)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1.5 }}
                >
                  {format(m.date, "d MMM · HH:mm", { locale: dateLocale })}
                </Typography>

                <Typography
                  variant="body1"
                  sx={{ lineHeight: 1.35, color: "text.primary", mb: 0.25 }}
                >
                  {m.isHome ? (
                    <>
                      <Box component="span" sx={{ fontWeight: 800 }}>
                        {m.team.name}
                      </Box>{" "}
                      <Box component="span" sx={{ color: "text.secondary", fontWeight: 600 }}>
                        vs
                      </Box>{" "}
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario"}
                      </Box>
                    </>
                  ) : (
                    <>
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario"}
                      </Box>{" "}
                      <Box component="span" sx={{ color: "text.secondary", fontWeight: 600 }}>
                        vs
                      </Box>{" "}
                      <Box component="span" sx={{ fontWeight: 800 }}>
                        {m.team.name}
                      </Box>
                    </>
                  )}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mt: 1,
                    color: "text.secondary",
                  }}
                >
                  {m.isHome ? (
                    <HomeIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <FlightTakeoffIcon sx={{ fontSize: 16 }} />
                  )}
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {m.isHome ? tMatches("home") : tMatches("away")}
                    {m.venue ? ` · ${m.venue}` : ""}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Link>
        );
      })}
    </Stack>
  );
}
