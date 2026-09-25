"use client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Box, Grid2 as Grid, Link as MuiLink, Paper, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BackpackOutlinedIcon from "@mui/icons-material/BackpackOutlined";
import PlaceIcon from "@mui/icons-material/Place";
import { format } from "date-fns";
import ContactForm from "@/components/common/ContactForm";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { CLUB_VENUE, CLUB_VENUE_LABEL, mapsSearchUrl, trainingLocation } from "@/lib/clubVenue";

interface UpcomingSession {
  id: string;
  date: string;
  endTime: string | null;
  location?: string | null;
}

// "martedì 8 giugno" -> "Martedì 8 giugno": ::first-letter non agisce su un inline.
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function InfoBlock({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box aria-hidden="true" sx={{ color: "text.secondary", display: "flex" }}>
          {icon}
        </Box>
        <Typography variant="subtitle1" component="h3" fontWeight={700}>
          {title}
        </Typography>
      </Box>
      {children}
    </Paper>
  );
}

/**
 * "Vieni a provare" (UX-15): in una schermata quando (i prossimi allenamenti
 * veri, non un orario scritto a mano), dove, cosa portare e il modulo per
 * scriverci. Prima queste informazioni erano sparse fra Contatti e FAQ.
 */
export default function TryItSection() {
  const t = useTranslations("pages.contatti");
  const dateLocale = useActiveDateLocale();
  const { data: sessions, isLoading } = useQuery<UpcomingSession[]>({
    queryKey: ["sessions", "upcoming", 3],
    queryFn: async () => {
      const res = await fetch("/api/sessions?upcoming=true&limit=3");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      // Con `limit` la rotta risponde paginata: { sessions, total, ... }.
      return Array.isArray(data) ? data : (data.sessions ?? []);
    },
    staleTime: 5 * 60_000,
  });

  return (
    <Box
      id="vieni-a-provare"
      component="section"
      sx={{ scrollMarginTop: { xs: 128, sm: 136 }, mb: 6 }}
    >
      <Typography variant="h4" component="h2" fontWeight={800} sx={{ mb: 1 }}>
        {t("tryTitle")}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2.5, maxWidth: 640 }}>
        {t("tryIntro")}
      </Typography>

      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <InfoBlock icon={<AccessTimeIcon />} title={t("tryWhen")}>
            {isLoading ? (
              <Typography variant="body2" color="text.secondary">
                {t("tryWhenLoading")}
              </Typography>
            ) : sessions && sessions.length > 0 ? (
              <Box component="ul" sx={{ m: 0, pl: 2.5, mb: 1 }}>
                {sessions.map((s) => {
                  const d = new Date(s.date);
                  const end = s.endTime ? new Date(s.endTime) : null;
                  const place = trainingLocation(s.location);
                  return (
                    <Typography component="li" variant="body2" key={s.id} sx={{ mb: 0.25 }}>
                      {capitalize(format(d, "EEEE d MMMM", { locale: dateLocale }))},{" "}
                      {format(d, "HH:mm")}
                      {end && `–${format(end, "HH:mm")}`}
                      {place !== CLUB_VENUE_LABEL && ` · ${place}`}
                    </Typography>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t("tryWhenEmpty")}
              </Typography>
            )}
            <MuiLink href="/calendario" variant="body2" fontWeight={600}>
              {t("tryCalendar")}
            </MuiLink>
          </InfoBlock>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <InfoBlock icon={<PlaceIcon />} title={t("tryWhere")}>
            <Typography variant="body2" fontWeight={700}>
              {CLUB_VENUE.name}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {CLUB_VENUE.street} · {CLUB_VENUE.postalCode} {CLUB_VENUE.city} ({CLUB_VENUE.province}
              )
            </Typography>
            <MuiLink
              href={mapsSearchUrl(CLUB_VENUE_LABEL)}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              fontWeight={600}
            >
              {t("tryOpenMap")}
            </MuiLink>
          </InfoBlock>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <InfoBlock icon={<BackpackOutlinedIcon />} title={t("tryBring")}>
            <Typography variant="body2">{t("tryBringText")}</Typography>
          </InfoBlock>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 1.5 }}
      >
        <ContactForm />
      </Paper>
      <MuiLink href="/faq" variant="body2" fontWeight={600}>
        {t("tryFaq")}
      </MuiLink>
    </Box>
  );
}
