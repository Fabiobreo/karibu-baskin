import { Box, Chip, Paper, Typography } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import { format } from "date-fns";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { getEntityLabels } from "@/lib/entityLabels";
import { MATCH_RESULT_META } from "@/lib/matchResults";
import type { AnyMatch } from "./types";

export default async function PlayedMatchCard({
  match,
  teamName,
  teamColor: _teamColor,
}: {
  match: AnyMatch;
  teamName: string;
  teamColor: string;
}) {
  const [t, locale, { matchResultLabel }] = await Promise.all([
    getTranslations("matches"),
    getLocale(),
    getEntityLabels(),
  ]);
  const dateLocale = getDateFnsLocale(locale);
  const matchTypeLabel = (ty: string) =>
    ({ LEAGUE: t("typeLeague"), TOURNAMENT: t("typeTournament"), FRIENDLY: t("typeFriendly") })[
      ty
    ] ?? ty;

  const leftName = match.isHome ? teamName : match.opponent.name;
  const rightName = match.isHome ? match.opponent.name : teamName;
  const leftScore = match.isHome ? match.ourScore : match.theirScore;
  const rightScore = match.isHome ? match.theirScore : match.ourScore;
  const leftIsUs = match.isHome;
  const res = match.result ? MATCH_RESULT_META[match.result] : null;

  return (
    <Link href={`/partite/${match.slug ?? match.id}`} style={{ textDecoration: "none" }}>
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          cursor: "pointer",
          transition: "box-shadow 0.15s, border-color 0.15s",
          "&:hover": {
            boxShadow: 2,
            borderColor: "text.disabled",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "stretch" }}>
          <Box sx={{ width: 5, flexShrink: 0, bgcolor: res?.color ?? "action.hover" }} />
          <Box
            sx={{
              flex: 1,
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ minWidth: 90, flexShrink: 0 }}>
              <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.82rem" }}>
                {format(new Date(match.date), "d MMM yyyy", { locale: dateLocale })}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, mt: 0.2 }}>
                {match.isHome ? (
                  <HomeIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                ) : (
                  <FlightIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                )}
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
                  {match.isHome ? t("home") : t("away")} · {matchTypeLabel(match.matchType)}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                flex: 1,
                minWidth: 200,
                display: "flex",
                alignItems: "center",
                gap: 1,
                justifyContent: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: leftIsUs ? 800 : 600,
                  color: leftIsUs ? "text.primary" : "text.secondary",
                  textAlign: "right",
                  flex: "1 1 0",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {leftName}
              </Typography>
              {leftScore !== null && rightScore !== null ? (
                <Typography
                  fontWeight={900}
                  sx={{
                    fontSize: "1.15rem",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                    flexShrink: 0,
                    px: 0.5,
                  }}
                >
                  {leftScore}–{rightScore}
                </Typography>
              ) : (
                <Typography sx={{ color: "text.disabled", fontWeight: 700, px: 0.5 }}>
                  vs
                </Typography>
              )}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: leftIsUs ? 600 : 800,
                  color: leftIsUs ? "text.secondary" : "text.primary",
                  textAlign: "left",
                  flex: "1 1 0",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {rightName}
              </Typography>
            </Box>
            <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1 }}>
              {res && (
                <Chip
                  label={matchResultLabel(match.result!)}
                  size="small"
                  sx={{
                    bgcolor: res.bg,
                    color: res.color,
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    height: 22,
                  }}
                />
              )}
              <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled" }} />
            </Box>
          </Box>
        </Box>
      </Paper>
    </Link>
  );
}
