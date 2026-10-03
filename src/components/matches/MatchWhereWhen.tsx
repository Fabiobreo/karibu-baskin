import { Box, Button, Link as MuiLink, Paper, Typography } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PlaceIcon from "@mui/icons-material/Place";
import EventIcon from "@mui/icons-material/Event";
import { getLocale, getTranslations } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { formatRome } from "@/lib/dateUtils";
import { mapsSearchUrl, type MatchLocation } from "@/lib/clubVenue";
import MatchSubscribeLink from "@/components/matches/MatchSubscribeLink";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";

interface MatchWhereWhenProps {
  matchId: string;
  date: Date;
  location: MatchLocation;
}

const rowSx = { display: "flex", alignItems: "flex-start", gap: 1.25 } as const;
const iconSx = { color: "text.secondary", mt: 0.25 } as const;

/**
 * Blocco "Dove e quando" della partita non ancora giocata (UX-50): data e ora,
 * luogo con link a Google Maps (niente embed, come UX-15) e "Aggiungi al
 * calendario" con il .ics della sola partita. Server Component; lo vedono
 * tutti, tesserati compresi (l'indirizzo serve soprattutto ai genitori).
 */
export default async function MatchWhereWhen({ matchId, date, location }: MatchWhereWhenProps) {
  const [t, locale] = await Promise.all([getTranslations("matches.whereWhen"), getLocale()]);
  const dateLocale = getDateFnsLocale(locale);
  const when = formatRome(date, "EEEE d MMMM yyyy · HH:mm", { locale: dateLocale });

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-labelledby="match-where-when-title"
      sx={{ p: { xs: 2, sm: 2.5 } }}
    >
      <Typography id="match-where-when-title" component="h2" variant="h6" sx={{ mb: 1.5 }}>
        {t("title")}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={rowSx}>
          <CalendarTodayIcon fontSize="small" sx={iconSx} aria-hidden="true" />
          <Typography variant="body1" sx={{ "&::first-letter": { textTransform: "uppercase" } }}>
            {when}
          </Typography>
        </Box>
        <Box sx={rowSx}>
          <PlaceIcon fontSize="small" sx={iconSx} aria-hidden="true" />
          {location.label ? (
            <MuiLink
              href={mapsSearchUrl(location.label)}
              target="_blank"
              rel="noopener noreferrer"
              variant="body1"
              aria-label={t("openInMaps", { place: location.label })}
              sx={{ overflowWrap: "anywhere" }}
            >
              {location.label}
            </MuiLink>
          ) : (
            <Typography variant="body1" color="text.secondary">
              {t("locationTbc")}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          mt: 2,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          columnGap: 2,
          rowGap: 1,
        }}
      >
        <Button
          href={`/api/matches/${matchId}/event.ics`}
          variant="outlined"
          startIcon={<EventIcon />}
          sx={TOUCH_TARGET_ON_PHONE}
        >
          {t("addToCalendar")}
        </Button>
        <MatchSubscribeLink label={t("subscribe")} />
      </Box>
    </Paper>
  );
}
