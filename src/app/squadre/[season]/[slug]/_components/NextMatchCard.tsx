import { Box, Chip, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import BoltIcon from "@mui/icons-material/Bolt";
import PlaceIcon from "@mui/icons-material/Place";
import Image from "next/image";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import StatusPill from "@/components/common/StatusPill";
import { MATCH_RESULT_META } from "@/lib/matches/matchResults";
import type { AnyMatch } from "./types";
import { onHover } from "@/lib/hoverStyles";
import { brandColor, heroText } from "@/lib/heroStyles";
import { TYPE_SCALE } from "@/lib/typeScale";
import { formatRome } from "@/lib/dateUtils";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

const CLUB_CREST = "/logo.png";

/** Stemma sopra il nome: un cerchio uguale ai due lati, un po' più grande delle iniziali. */
const crestSx = {
  width: { xs: 52, md: 64 },
  height: { xs: 52, md: 64 },
  borderRadius: "50%",
  objectFit: "contain",
  display: "block",
} as const;

export default async function NextMatchCard({
  match,
  teamName,
  teamColor,
  now,
  previousMeeting,
}: {
  match: AnyMatch;
  teamName: string;
  /** Hex della tinta squadra (da `teamColor()`), o null: nessun segno di colore. */
  teamColor: string | null;
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
  // Dal nostro lato c'è sempre lo stemma del club; l'avversaria ha il suo se
  // lo staff l'ha caricato, altrimenti l'iniziale.
  const opponentCrest = match.opponent.imageUrl ?? null;

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
          borderRadius: RADIUS.lg,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 2,
          cursor: "pointer",
          transition: "all 0.2s",
          ...onHover({
            transform: "translateY(-3px)",
            boxShadow: 6,
          }),
        }}
      >
        {/* ── BANNER SCURO IN ALTO con tile calendario ─────────────────────── */}
        <Box
          sx={{
            // La tinta squadra affiora dall'angolo; senza tinta, nero del marchio pieno (UX-29).
            background: teamColor
              ? `linear-gradient(120deg, ${brandColor.dark} 0%, ${brandColor.dark} 55%, ${teamColor} 135%)`
              : brandColor.dark,
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
              borderRadius: RADIUS.md,
              overflow: "hidden",
              minWidth: { xs: 64, md: 74 },
              textAlign: "center",
              boxShadow: `0 4px 14px ${alpha(brandColor.black, 0.35)}`,
            }}
          >
            <Box
              sx={{
                bgcolor: teamColor ?? brandColor.darkSoft,
                color: "common.white",
                px: 1,
                py: 0.4,
                fontSize: TYPE_SCALE.xs,
                fontWeight: FONT_WEIGHT.bold,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {formatRome(new Date(match.date), "EEE", { locale: dateLocale })}
            </Box>
            <Box sx={{ px: 1, py: 0.75 }}>
              <Typography
                sx={{
                  fontSize: { xs: TYPE_SCALE.xl3, md: TYPE_SCALE.xl4 },
                  fontWeight: FONT_WEIGHT.bold,
                  // Il foglietto e' bianco in entrambi i temi: testo scuro fisso.
                  color: brandColor.dark,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatRome(new Date(match.date), "d")}
              </Typography>
              <Typography
                sx={{
                  fontSize: TYPE_SCALE.xs,
                  fontWeight: FONT_WEIGHT.bold,
                  color: alpha(brandColor.dark, 0.72),
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  mt: 0.25,
                }}
              >
                {formatRome(new Date(match.date), "MMM", { locale: dateLocale })}
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
                  // La tinta squadra non e' mai testo (UX-29).
                  color: heroText.secondary,
                  fontWeight: FONT_WEIGHT.bold,
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
                  fontWeight: FONT_WEIGHT.bold,
                  fontSize: TYPE_SCALE.xs,
                  height: 20,
                }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: { xs: TYPE_SCALE.md, md: TYPE_SCALE.lg },
                fontWeight: FONT_WEIGHT.bold,
                color: "common.white",
                lineHeight: 1.2,
              }}
            >
              {formatRome(new Date(match.date), "EEEE d MMMM", { locale: dateLocale }).replace(
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
                  fontSize: TYPE_SCALE.xs,
                  fontWeight: FONT_WEIGHT.semibold,
                  color: "common.white",
                }}
              >
                ⏱ {formatRome(new Date(match.date), "HH:mm")}
              </Typography>
              <Typography sx={{ color: heroText.muted, fontSize: TYPE_SCALE.xs }}>·</Typography>
              <Typography
                sx={{
                  fontSize: TYPE_SCALE.xs,
                  fontWeight: FONT_WEIGHT.semibold,
                  color: isImminent ? heroText.primary : heroText.muted,
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
                // Stato temporale: pastiglia invertita, non una tinta (UX-29).
                <StatusPill onDark variant="inverted" icon={<BoltIcon />} label={t("imminent")} />
              )}
            </Box>
          </Box>

          {/* Casa invertita, trasferta contornata: stato, non esito (UX-29). */}
          <StatusPill
            onDark
            variant={isHomeMatch ? "inverted" : "outlined"}
            icon={isHomeMatch ? <HomeIcon /> : <DirectionsBusIcon />}
            label={isHomeMatch ? t("home") : t("away")}
            sx={{ flexShrink: 0 }}
          />
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
              bgcolor: isHomeMatch ? "action.hover" : "background.paper",
            }}
          >
            {/* Il nostro logo ha già il suo disco, niente bianco sotto. */}
            <Box sx={{ ...crestSx, position: "relative", flexShrink: 0 }}>
              <Image src={CLUB_CREST} alt="" fill sizes="64px" style={{ objectFit: "contain" }} />
            </Box>{" "}
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: FONT_WEIGHT.bold,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: TYPE_SCALE.xs,
              }}
            >
              Karibu
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: TYPE_SCALE.md, md: TYPE_SCALE.lg },
                fontWeight: FONT_WEIGHT.bold,
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
                fontWeight: FONT_WEIGHT.bold,
                fontSize: { xs: TYPE_SCALE.sm, md: TYPE_SCALE.md },
                letterSpacing: "0.05em",
                border: "3px solid",
                borderColor: teamColor ?? "background.paper",
                boxShadow: `0 2px 8px ${alpha(brandColor.black, 0.2)}`,
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
            {opponentCrest ? (
              // `<img>` semplice: l'URL lo scrive lo staff, e un host non previsto
              // farebbe cadere `next/image`. Bianco sotto, i loghi nascono per il chiaro.
              <Box
                component="img"
                src={opponentCrest}
                alt=""
                sx={{
                  ...crestSx,
                  bgcolor: "common.white",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
            ) : (
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
                  fontWeight: FONT_WEIGHT.bold,
                  fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 },
                  boxShadow: `0 3px 10px ${alpha(brandColor.black, 0.2)}`,
                }}
              >
                {themName[0]?.toUpperCase()}
              </Box>
            )}
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: FONT_WEIGHT.bold,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: TYPE_SCALE.xs,
              }}
            >
              {t("opponent")}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: TYPE_SCALE.md, md: TYPE_SCALE.lg },
                fontWeight: FONT_WEIGHT.bold,
                lineHeight: 1.15,
                textAlign: "center",
                color: "text.primary",
                wordBreak: "break-word",
              }}
            >
              {themName}
            </Typography>
            {match.opponent.city && (
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: FONT_WEIGHT.semibold }}
              >
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
                <PlaceIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                <Typography
                  variant="caption"
                  sx={{ fontWeight: FONT_WEIGHT.semibold, color: "text.primary" }}
                >
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
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: FONT_WEIGHT.semibold,
                    fontSize: TYPE_SCALE.xs,
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
                    color: "match.onFill",
                    px: 1,
                    py: 0.25,
                    borderRadius: RADIUS.sm,
                    fontWeight: FONT_WEIGHT.bold,
                    fontSize: TYPE_SCALE.xs,
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontSize: TYPE_SCALE.xs,
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
                  <Box component="span" sx={{ opacity: 0.5, fontSize: TYPE_SCALE.xs }}>
                    ·
                  </Box>
                  <Box
                    component="span"
                    sx={{ fontVariantNumeric: "tabular-nums", fontSize: TYPE_SCALE.xs }}
                  >
                    {prev.isHome ? prevOurScore : prevTheirScore}–
                    {prev.isHome ? prevTheirScore : prevOurScore}
                  </Box>
                </Box>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", fontWeight: FONT_WEIGHT.semibold }}
                >
                  {formatRome(new Date(prev.date), "d MMM", { locale: dateLocale })}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Link>
  );
}
