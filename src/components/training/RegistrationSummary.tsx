"use client";
import { Box, Link as MuiLink, Paper, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceIcon from "@mui/icons-material/Place";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { mapsSearchUrl, trainingLocation } from "@/lib/clubVenue";

export interface MyRegistration {
  id: string;
  name: string;
  userId: string | null;
  childId: string | null;
}

interface RegistrationSummaryProps {
  date: string;
  endTime: string | null;
  location?: string | null;
  mine: MyRegistration[];
  currentUserId: string | null;
}

/**
 * Riepilogo che resta nella pagina dopo l'iscrizione (UX-15): chi e' iscritto,
 * quando e dove. Prima c'era solo un avviso che spariva.
 */
export default function RegistrationSummary({
  date,
  endTime,
  location,
  mine,
  currentUserId,
}: RegistrationSummaryProps) {
  const t = useTranslations("trainings");
  const dateLocale = useActiveDateLocale();
  if (mine.length === 0) return null;

  const self = mine.some((r) => r.userId && r.userId === currentUserId);
  const others = mine.filter((r) => !(r.userId && r.userId === currentUserId)).map((r) => r.name);
  const names = others.join(", ");
  const title = self
    ? others.length > 0
      ? t("summarySelfWith", { names })
      : t("summarySelf")
    : t("summaryOthers", { names });

  const start = new Date(date);
  const end = endTime ? new Date(endTime) : null;
  const place = trainingLocation(location);

  return (
    <Paper
      variant="outlined"
      role="status"
      sx={{ p: { xs: 2, sm: 2.5 }, borderColor: "success.main", borderWidth: 2 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <CheckCircleIcon sx={{ color: "success.main" }} />
        <Typography variant="subtitle1" component="h2" fontWeight={700}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <AccessTimeIcon fontSize="small" sx={{ color: "text.secondary" }} aria-hidden="true" />
        <Typography variant="body2" sx={{ "&::first-letter": { textTransform: "uppercase" } }}>
          {format(start, "EEEE d MMMM", { locale: dateLocale })}, {format(start, "HH:mm")}
          {end && `–${format(end, "HH:mm")}`}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <PlaceIcon fontSize="small" sx={{ color: "text.secondary" }} aria-hidden="true" />
        <MuiLink
          href={mapsSearchUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          variant="body2"
          aria-label={t("locationMap", { place })}
        >
          {place}
        </MuiLink>
      </Box>
    </Paper>
  );
}
