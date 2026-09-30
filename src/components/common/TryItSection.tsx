"use client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Box, Link as MuiLink, Paper, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BackpackOutlinedIcon from "@mui/icons-material/BackpackOutlined";
import PlaceIcon from "@mui/icons-material/Place";
import { format } from "date-fns";
import ContactForm from "@/components/common/ContactForm";
import MapEmbed from "@/components/common/MapEmbed";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { CLUB_VENUE, CLUB_VENUE_LABEL, mapsSearchUrl, trainingLocation } from "@/lib/clubVenue";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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
  area,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  area: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, gridArea: area, display: "flex", flexDirection: "column" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box aria-hidden="true" sx={{ color: "text.secondary", display: "flex" }}>
          {icon}
        </Box>
        <Typography variant="subtitle1" component="h3">
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
      <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
        {t("tryTitle")}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2.5, maxWidth: 640 }}>
        {t("tryIntro")}
      </Typography>

      {/* Su mobile l'ordine e' quello delle domande di chi viene: quando, dove,
          cosa portare. Da md la mappa prende la colonna larga a destra. */}
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          mb: 2.5,
          gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" },
          gridTemplateAreas: {
            xs: '"when" "where" "bring"',
            md: '"when where" "bring where"',
          },
        }}
      >
        <InfoBlock icon={<AccessTimeIcon />} title={t("tryWhen")} area="when">
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
          <MuiLink href="/calendario" variant="body2" fontWeight={FONT_WEIGHT.semibold}>
            {t("tryCalendar")}
          </MuiLink>
        </InfoBlock>
        <InfoBlock icon={<PlaceIcon />} title={t("tryWhere")} area="where">
          <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
            {CLUB_VENUE.name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {CLUB_VENUE.street} · {CLUB_VENUE.postalCode} {CLUB_VENUE.city} ({CLUB_VENUE.province})
          </Typography>
          {/* La mappa riempie il resto della card: su desktop la card e' alta
              quanto "Quando" e "Cosa portare" messe insieme. */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: { xs: 200, md: 220 },
            }}
          >
            <MapEmbed height="100%" externalLink={false} />
          </Box>
        </InfoBlock>
        <InfoBlock icon={<BackpackOutlinedIcon />} title={t("tryBring")} area="bring">
          <Typography variant="body2">{t("tryBringText")}</Typography>
        </InfoBlock>
      </Box>

      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid", borderColor: "divider", borderRadius: RADIUS.lg, mb: 1.5 }}
      >
        <ContactForm />
      </Paper>
      <MuiLink href="/faq" variant="body2" fontWeight={FONT_WEIGHT.semibold}>
        {t("tryFaq")}
      </MuiLink>
    </Box>
  );
}
