import { Box, Chip, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import BoltIcon from "@mui/icons-material/Bolt";
import PlaceIcon from "@mui/icons-material/Place";
import Link from "next/link";
import { format } from "date-fns";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { MATCH_RESULT_META } from "@/lib/matchResults";
import type { AnyMatch } from "./types";

export default async function NextMatchCard({
  match,
  teamName,
  teamColor,
  now,
  previousMeeting,
}: {
  match: AnyMatch;
  teamName: string;
  teamColor: string;
  now: Date;
  previousMeeting: AnyMatch | null;
}) {
  const [t, tCommon, locale] = await Promise.all([
    getTranslations("matches"),
    getTranslations("common"),
    getLocale(),
  ]);
  const dateLocale = getDateFnsLocale(locale);
  const matchTypeLabel = (ty: string) =>
    ({ LEAGUE: t("typeLeague"), TOURNAMENT: t("typeTournament"), FRIENDLY: t("typeFriendly") })[
      ty
    ] ?? ty;

  const imminentLimit = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const isImminent = match.date <= imminentLimit;

  // Countdown grossolano (server-side, no live update)
  const diffMs = match.date.getTime() - now.getTime();
  const totalHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  const isHomeMatch = match.isHome;
  const usName = teamName;
  const themName = match.opponent.name;

  const prev = previousMeeting;
  const prevOurScore = prev?.ourScore ?? null;
  const prevTheirScore = prev?.theirScore ?? null;

  return (
    <Link
      href={`/partite/${match.slug ?? match.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 2,
          cursor: "pointer",
          transition: "all 0.2s",
          "&:hover": {
            transform: "translateY(-3px)",
            boxShadow: `0 10px 32px ${alpha(teamColor, 0.2)}`,
          },
        }}
      >
        {/* ── BANNER SCURO IN ALTO con tile calendario ─────────────────────── */}
        <Box
          sx={{
            background: `linear-gradient(120deg, #1A1A1A 0%, #1A1A1A 55%, ${teamColor} 135%)`,
            color: "common.white",
            px: { xs: 2, md: 3 },
            py: { xs: 2, md: 2.25 },
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: { xs: 2, md: 2.5 },
          }}
        >
          {/* Tile calendario "foglietto strappato" */}
          <Box
            sx={{
              flexShrink: 0,
              bgcolor: "common.white",
              borderRadius: 1.5,
              overflow: "hidden",
              minWidth: { xs: 64, md: 74 },
              textAlign: "center",
              boxShadow: `0 4px 14px ${alpha("#000000", 0.35)}`,
            }}
          >
            <Box
              sx={{
                bgcolor: teamColor,
                color: "common.white",
                px: 1,
                py: 0.4,
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {format(new Date(match.date), "EEE", { locale: dateLocale })}
            </Box>
            <Box sx={{ px: 1, py: 0.75 }}>
              <Typography
                sx={{
                  fontSize: { xs: "1.7rem", md: "2rem" },
                  fontWeight: 900,
                  color: "text.primary",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {format(new Date(match.date), "d")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  color: "text.secondary",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  mt: 0.25,
                }}
              >
                {format(new Date(match.date), "MMM", { locale: dateLocale })}
              </Typography>
            </Box>
          </Box>

          {/* Info centrale */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flexWrap: "wrap",
                mb: 0.5,
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  color: teamColor,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  lineHeight: 1,
                }}
              >
                {`★ ${t("nextMatch")}`}
              </Typography>
              <Chip
                label={matchTypeLabel(match.matchType)}
                size="small"
                sx={{
                  bgcolor: "common.white",
                  color: "grey.900",
                  fontWeight: 800,
                  fontSize: "0.6rem",
                  height: 18,
                }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: { xs: "1rem", md: "1.15rem" },
                fontWeight: 800,
                color: "common.white",
                lineHeight: 1.2,
              }}
            >
              {format(new Date(match.date), "EEEE d MMMM", { locale: dateLocale }).replace(
                /^./,
                (c) => c.toUpperCase()
              )}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                mt: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "common.white",
                }}
              >
                ⏱ {format(new Date(match.date), "HH:mm")}
              </Typography>
              <Typography sx={{ color: "text.disabled", fontSize: "0.78rem" }}>·</Typography>
              <Typography
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: isImminent ? teamColor : "text.disabled",
                }}
              >
                {days === 0 && hours === 0
                  ? t("inProgressNow")
                  : days === 0
                    ? t("hoursLeft", { count: hours })
                    : days === 1
                      ? `${tCommon("tomorrow")}${hours > 0 ? ` · ${hours}h` : ""}`
                      : t("daysLeft", { count: days })}
              </Typography>
              {isImminent && (
                <Chip
                  icon={<BoltIcon sx={{ fontSize: 12, color: "common.white !important" }} />}
                  label={t("imminent")}
                  size="small"
                  sx={{
                    bgcolor: teamColor,
                    color: "common.white",
                    fontWeight: 800,
                    fontSize: "0.6rem",
                    height: 18,
                    letterSpacing: "0.04em",
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Badge casa/trasferta */}
          <Box
            sx={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.4,
              bgcolor: isHomeMatch ? "match.win" : "#1565C0",
              px: 1.5,
              py: 1,
              borderRadius: 1.5,
              minWidth: 64,
            }}
          >
            {isHomeMatch ? (
              <HomeIcon sx={{ fontSize: 18, color: "common.white" }} />
            ) : (
              <FlightIcon sx={{ fontSize: 18, color: "common.white" }} />
            )}
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 800,
                color: "common.white",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {isHomeMatch ? t("home") : t("away")}
            </Typography>
          </Box>
        </Box>

        {/* ── CORPO: matchup tipo cartellone ───────────────────────────────── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "stretch",
            position: "relative",
            bgcolor: "background.paper",
          }}
        >
          {/* NOI */}
          <Box
            sx={{
              p: { xs: 2.5, md: 3 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              borderRight: `1px solid ${alpha(teamColor, 0.13)}`,
              bgcolor: isHomeMatch ? alpha(teamColor, 0.031) : "background.paper",
            }}
          >
            <Box
              sx={{
                width: { xs: 44, md: 54 },
                height: { xs: 44, md: 54 },
                borderRadius: "50%",
                bgcolor: teamColor,
                color: "common.white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: { xs: "1.4rem", md: "1.7rem" },
                boxShadow: `0 3px 10px ${alpha(teamColor, 0.33)}`,
              }}
            >
              {usName[0]?.toUpperCase()}
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: teamColor,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: "0.6rem",
              }}
            >
              Karibu
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "0.95rem", md: "1.15rem" },
                fontWeight: 900,
                lineHeight: 1.15,
                textAlign: "center",
                color: "text.primary",
                wordBreak: "break-word",
              }}
            >
              {usName}
            </Typography>
          </Box>

          {/* VS centrale */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: { xs: 1, md: 1.5 },
              position: "relative",
            }}
          >
            <Box
              sx={{
                width: { xs: 36, md: 46 },
                height: { xs: 36, md: 46 },
                borderRadius: "50%",
                bgcolor: "grey.900",
                color: "common.white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: { xs: "0.85rem", md: "1rem" },
                letterSpacing: "0.05em",
                border: `3px solid ${teamColor}`,
                boxShadow: `0 2px 8px ${alpha("#000000", 0.2)}`,
              }}
            >
              VS
            </Box>
          </Box>

          {/* AVVERSARIO */}
          <Box
            sx={{
              p: { xs: 2.5, md: 3 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              borderLeft: "1px solid",
              borderColor: "divider",
              bgcolor: !isHomeMatch ? "action.hover" : "background.paper",
            }}
          >
            <Box
              sx={{
                width: { xs: 44, md: 54 },
                height: { xs: 44, md: 54 },
                borderRadius: "50%",
                bgcolor: "grey.800",
                color: "common.white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: { xs: "1.4rem", md: "1.7rem" },
                boxShadow: `0 3px 10px ${alpha("#000000", 0.2)}`,
              }}
            >
              {themName[0]?.toUpperCase()}
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: "text.disabled",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: "0.6rem",
              }}
            >
              {t("opponent")}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "0.95rem", md: "1.15rem" },
                fontWeight: 900,
                lineHeight: 1.15,
                textAlign: "center",
                color: "text.primary",
                wordBreak: "break-word",
              }}
            >
              {themName}
            </Typography>
            {match.opponent.city && (
              <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
                {match.opponent.city}
              </Typography>
            )}
          </Box>
        </Box>

        {/* ── FOOTER chiaro: venue + precedente incontro ─────────────────── */}
        {(match.venue || (prev && prevOurScore !== null && prevTheirScore !== null)) && (
          <Box
            sx={{
              bgcolor: "background.paper",
              borderTop: "1px solid",
              borderColor: "divider",
              px: { xs: 2.5, md: 3.5 },
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {match.venue ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PlaceIcon sx={{ fontSize: 15, color: teamColor }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                  {match.venue}
                </Typography>
              </Box>
            ) : (
              <Box />
            )}

            {prev && prevOurScore !== null && prevTheirScore !== null && prev.result && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 700,
                    fontSize: "0.62rem",
                  }}
                >
                  {t("firstLeg")}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    bgcolor: MATCH_RESULT_META[prev.result].color,
                    color: "common.white",
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontWeight: 800,
                    fontSize: "0.72rem",
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontSize: "0.62rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      opacity: 0.95,
                    }}
                  >
                    {prev.result === "WIN"
                      ? t("wonShort")
                      : prev.result === "LOSS"
                        ? t("lostShort")
                        : t("drawShort")}
                  </Box>
                  <Box component="span" sx={{ opacity: 0.5, fontSize: "0.62rem" }}>
                    ·
                  </Box>
                  <Box
                    component="span"
                    sx={{ fontVariantNumeric: "tabular-nums", fontSize: "0.78rem" }}
                  >
                    {prev.isHome ? prevOurScore : prevTheirScore}–
                    {prev.isHome ? prevTheirScore : prevOurScore}
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
                  {format(new Date(prev.date), "d MMM", { locale: dateLocale })}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Link>
  );
}
