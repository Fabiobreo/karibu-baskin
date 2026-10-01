"use client";
import { Box, Grid2 as Grid, Typography, Button } from "@mui/material";
import { useTranslations } from "next-intl";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import StatusPill from "@/components/common/StatusPill";
import SessionCard, { type SessionWithCount } from "@/components/training/SessionCard";
import SessionHeroCard from "@/components/training/SessionHeroCard";
import { TRY_IT_HREF } from "@/lib/clubVenue";
import { TYPE_SCALE } from "@/lib/typeScale";

export default function HomeSessionsSection({
  inCorso: initInCorso,
  upcoming: initUpcoming,
  registrationIdBySession,
  isStaff,
  isMember = false,
  featuredAbove = false,
}: {
  inCorso: SessionWithCount[];
  upcoming: SessionWithCount[];
  registrationIdBySession: Record<string, string>;
  isStaff: boolean;
  /** Tesserato: niente inviti a "venire a provare" (UX-16). */
  isMember?: boolean;
  /** Il prossimo allenamento e' gia' nella card in testa alla home (UX-33). */
  featuredAbove?: boolean;
}) {
  const t = useTranslations("trainings");
  // Niente stato locale ne' azioni staff: le squadre e il resto si gestiscono
  // da /admin/allenamenti (UX-14), la card porta li' con "Gestisci".
  const inCorso = initInCorso;
  const upcoming = initUpcoming;

  // Nessun `return null` quando entrambe le liste sono vuote: quel caso ha il
  // suo stato dedicato qui sotto. Uscire in anticipo lasciava vuoto il
  // contenitore #allenamenti, e la CTA della hero ci scorreva sopra.
  // L'unico allenamento in vista e' gia' nella card in testa (UX-33): la
  // sezione non ha altro da dire e sparisce, resta solo lo spazio.
  if (featuredAbove && inCorso.length === 0 && upcoming.length === 0) {
    return <Box sx={{ pt: { xs: 3, md: 5 } }} />;
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      {inCorso.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {/* In corso: pastiglia invertita con pallino pulsante, niente verde (UX-29). */}
          <Box sx={{ mb: 1.5 }}>
            <StatusPill label={t("live")} pulse />
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
              <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                {t("gym")}
              </Typography>
              <Typography
                variant="h5"
                component="h2"
                sx={{ mt: 0.25, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl2 } }}
              >
                {t("next")}
              </Typography>
            </Box>
          </Box>
          <Typography color="text.secondary" sx={{ mb: 2.5, maxWidth: 560 }}>
            {isMember ? t("homeNoneSoonMember") : t("homeNoneSoon")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            {!isMember && (
              <Button href={TRY_IT_HREF} variant="contained">
                {t("homeNoneSoonCta")}
              </Button>
            )}
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
              <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                {t("gym")}
              </Typography>
              <Typography
                variant="h5"
                component="h2"
                sx={{ mt: 0.25, fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl2 } }}
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
    </Box>
  );
}
