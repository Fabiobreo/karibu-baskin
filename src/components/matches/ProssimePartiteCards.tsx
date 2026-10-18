"use client";
import Link from "next/link";
import { Box, Typography, Paper, Chip, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import BoltIcon from "@mui/icons-material/Bolt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { onHover } from "@/lib/hoverStyles";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { teamFill } from "@/lib/teamColors";
import type { HomeCallupStatus } from "@/lib/matches/homeCallupStatus";

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
  /** Solo per i tesserati: convocazione propria o dei figli, risposta mancante. */
  callupStatus?: HomeCallupStatus | null;
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

/**
 * Una riga sotto la card: convocato (verde = positivo, con l'icona, come il
 * "Ci sei" degli allenamenti) o risposta mancante (neutro, con l'icona).
 */
function CallupStatusLine({ status }: { status: HomeCallupStatus }) {
  const t = useTranslations("matches");
  const locale = useLocale();
  const { calledSelf, calledOthers, pending } = status;
  if (!calledSelf && calledOthers.length === 0 && !pending) return null;

  const names = new Intl.ListFormat(locale, { type: "conjunction" }).format(calledOthers);
  const text =
    calledSelf && calledOthers.length > 0
      ? t("homeCalledSelfAndOthers", { names })
      : calledSelf
        ? t("homeCalledSelf")
        : calledOthers.length > 0
          ? t("homeCalledOthers", { names, count: calledOthers.length })
          : t("homeAvailabilityPending");
  const called = calledSelf || calledOthers.length > 0;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        mt: 1.5,
        pt: 1.5,
        borderTop: "1px solid",
        borderColor: "divider",
        color: called ? "success.main" : "text.secondary",
      }}
    >
      {called ? (
        <CheckCircleIcon sx={{ fontSize: 18 }} aria-hidden="true" />
      ) : (
        <HelpOutlineIcon sx={{ fontSize: 18 }} aria-hidden="true" />
      )}
      <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
        {text}
      </Typography>
    </Box>
  );
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
        const fill = teamFill(m.team.color);
        return (
          <Link
            key={m.id}
            href={m.slug ? `/partite/${m.slug}` : `/partite`}
            style={{ textDecoration: "none", display: "block" }}
          >
            <Paper
              elevation={highlight ? 6 : 2}
              sx={{
                height: "100%",
                position: "relative",
                overflow: "hidden",
                border: highlight ? "2px solid" : "1px solid",
                // Partita imminente: contorno piu' spesso in inchiostro, non in arancio.
                borderColor: highlight ? "text.primary" : "divider",
                transition: "all 0.18s",
                cursor: "pointer",
                ...onHover({
                  transform: "translateY(-3px)",
                  boxShadow: 8,
                }),
              }}
            >
              {/* Testata nella tinta della squadra, con il suo nome sopra (come le
                card di /squadre); senza tinta nessun segno di colore. */}
              {fill && (
                <Box
                  sx={{
                    px: { xs: 2, md: 2.5 },
                    py: 0.75,
                    bgcolor: fill.bg,
                    color: fill.fg,
                    boxShadow: fill.ring ? `inset 0 0 0 1px ${fill.ring}` : undefined,
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={FONT_WEIGHT.semibold}
                    sx={{ color: "inherit", display: "block" }}
                    noWrap
                  >
                    {m.team.name}
                  </Typography>
                </Box>
              )}
              <Box sx={{ p: { xs: 2, md: 2.5 } }}>
                {m.isImminent && (
                  <Chip
                    icon={<BoltIcon sx={{ fontSize: 16 }} />}
                    label={tMatches("imminent")}
                    size="small"
                    sx={{
                      mb: 1,
                      // Neutro (UX-29): l'arancio e' di cio' che si tocca; l'urgenza
                      // la dicono etichetta e icona. Niente alone pulsante (UX-30).
                      bgcolor: "action.selected",
                      color: "text.primary",
                      "& .MuiChip-icon": { color: "text.secondary" },
                    }}
                  />
                )}
                <Typography
                  component="p"
                  variant="h6"
                  fontWeight={FONT_WEIGHT.bold}
                  sx={{
                    color: "text.primary",
                    lineHeight: 1.1,
                    fontSize: { xs: TYPE_SCALE.md, md: TYPE_SCALE.lg },
                  }}
                >
                  {relativeLabel(m.date, now, tCommon, dateLocale)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1.5 }}
                >
                  {format(m.date, "EEEE d MMMM · HH:mm", { locale: dateLocale })}
                </Typography>

                <Typography
                  variant="body1"
                  sx={{ lineHeight: 1.35, color: "text.primary", mb: 0.25 }}
                >
                  {m.isHome ? (
                    <>
                      <Box component="span" sx={{ fontWeight: FONT_WEIGHT.bold }}>
                        {m.team.name}
                      </Box>{" "}
                      <Box
                        component="span"
                        sx={{ color: "text.secondary", fontWeight: FONT_WEIGHT.semibold }}
                      >
                        vs
                      </Box>{" "}
                      <Box component="span" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                        {m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario"}
                      </Box>
                    </>
                  ) : (
                    <>
                      <Box component="span" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                        {m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario"}
                      </Box>{" "}
                      <Box
                        component="span"
                        sx={{ color: "text.secondary", fontWeight: FONT_WEIGHT.semibold }}
                      >
                        vs
                      </Box>{" "}
                      <Box component="span" sx={{ fontWeight: FONT_WEIGHT.bold }}>
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
                  <Typography variant="caption" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                    {m.isHome ? tMatches("home") : tMatches("away")}
                    {m.venue ? ` · ${m.venue}` : ""}
                  </Typography>
                </Box>
                {m.callupStatus && <CallupStatusLine status={m.callupStatus} />}
              </Box>
            </Paper>
          </Link>
        );
      })}
    </Stack>
  );
}
