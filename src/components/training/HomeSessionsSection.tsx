"use client";
import { Box, Grid2 as Grid, Typography, Button } from "@mui/material";
import { useTranslations } from "next-intl";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import SessionCard, { type SessionWithCount } from "@/components/training/SessionCard";
import SessionHeroCard from "@/components/training/SessionHeroCard";

export default function HomeSessionsSection({
  inCorso: initInCorso,
  upcoming: initUpcoming,
  registrationIdBySession,
  isStaff,
}: {
  inCorso: SessionWithCount[];
  upcoming: SessionWithCount[];
  registrationIdBySession: Record<string, string>;
  isStaff: boolean;
}) {
  const t = useTranslations("trainings");
  // Niente stato locale ne' azioni staff: le squadre e il resto si gestiscono
  // da /admin/allenamenti (UX-14), la card porta li' con "Gestisci".
  const inCorso = initInCorso;
  const upcoming = initUpcoming;

  // Nessun `return null` quando entrambe le liste sono vuote: quel caso ha il
  // suo stato dedicato qui sotto. Uscire in anticipo lasciava vuoto il
  // contenitore #allenamenti, e la CTA della hero ci scorreva sopra.
  return (
    <>
      {inCorso.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "status.live",
                flexShrink: 0,
                "@keyframes pulse": {
                  "0%": { boxShadow: "0 0 0 0 rgba(46,125,50,0.7)" },
                  "70%": { boxShadow: "0 0 0 8px rgba(46,125,50,0)" },
                  "100%": { boxShadow: "0 0 0 0 rgba(46,125,50,0)" },
                },
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
            <Typography
              variant="overline"
              fontWeight={700}
              sx={{ letterSpacing: "0.1em", color: "status.liveText" }}
            >
              {t("live")}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {inCorso.map((s) => (
              <Grid key={s.id} size={{ xs: 12, sm: inCorso.length > 1 ? 6 : 12 }}>
                <SessionCard
                  session={s}
                  live
                  isRegistered={!!registrationIdBySession[s.id]}
                  myRegistrationId={registrationIdBySession[s.id] ?? null}
                  isStaff={isStaff}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Nessun allenamento nella finestra della home (vedi page.tsx). Senza
          questo blocco la sezione spariva del tutto e la CTA "Prossimi
          allenamenti" della hero scorreva verso un contenitore vuoto. */}
      {inCorso.length === 0 && upcoming.length === 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <SportsBasketballIcon sx={{ color: "primary.main", fontSize: 32 }} />
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                fontWeight={700}
                sx={{ letterSpacing: "0.1em", lineHeight: 1 }}
              >
                {t("gym")}
              </Typography>
              <Typography
                variant="h5"
                component="h2"
                fontWeight={800}
                sx={{ mt: 0.25, fontSize: { xs: "1.4rem", md: "1.6rem" } }}
              >
                {t("next")}
              </Typography>
            </Box>
          </Box>
          <Typography color="text.secondary" sx={{ mb: 2.5, maxWidth: 560 }}>
            {t("homeNoneSoon")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button href="/contatti" variant="contained">
              {t("homeNoneSoonCta")}
            </Button>
            <Button href="/calendario" variant="outlined">
              {t("homeSeeCalendar")}
            </Button>
          </Box>
        </Box>
      )}

      {upcoming.length > 0 && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <SportsBasketballIcon sx={{ color: "primary.main", fontSize: 32 }} />
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                fontWeight={700}
                sx={{ letterSpacing: "0.1em", lineHeight: 1 }}
              >
                {t("gym")}
              </Typography>
              <Typography
                variant="h5"
                component="h2"
                fontWeight={800}
                sx={{ mt: 0.25, fontSize: { xs: "1.4rem", md: "1.6rem" } }}
              >
                {t("next")}
              </Typography>
            </Box>
          </Box>
          <Grid container spacing={2}>
            {upcoming.map((s) => (
              <Grid key={s.id} size={{ xs: 12, sm: upcoming.length > 1 ? 6 : 12 }}>
                <SessionHeroCard
                  session={s}
                  isRegistered={!!registrationIdBySession[s.id]}
                  myRegistrationId={registrationIdBySession[s.id] ?? null}
                  isStaff={isStaff}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </>
  );
}
