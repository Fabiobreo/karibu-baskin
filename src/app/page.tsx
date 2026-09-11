import { Suspense } from "react";
import { auth } from "@/lib/authjs";
import { getTranslations } from "next-intl/server";
import { Container, Typography, Box, Grid2 as Grid, Paper, Divider, Stack } from "@mui/material";
import HomeSessions from "@/components/training/HomeSessions";
import HomeSectionSkeleton from "@/components/common/HomeSectionSkeleton";
import JoinUsCta from "@/components/common/JoinUsCta";
import JsonLd from "@/components/common/JsonLd";
import { organizationJsonLd } from "@/lib/structuredData";
import HeroSection from "@/components/common/HeroSection";
import LatestNewsHero from "@/components/news/LatestNewsHero";
import LoSapeviCard from "@/components/common/LoSapeviCard";
import ProssimePartiteHome from "@/components/matches/ProssimePartiteHome";
import BirthdayBanner from "@/components/common/BirthdayBanner";
import GuestWelcomeBanner from "@/components/common/GuestWelcomeBanner";
import PendingAvailabilityBanner from "@/components/matches/PendingAvailabilityBanner";
import FavoriteIcon from "@mui/icons-material/Favorite";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import StarIcon from "@mui/icons-material/Star";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  description:
    "Iscriviti agli allenamenti e scopri le squadre del Karibu Baskin di Montecchio Maggiore.",
  path: "/",
});

export const revalidate = 0;

type StoriaItem = { anno: string; titolo: string; testo: string };
type ValueItem = { title: string; body: string };

// Prima di mandare HTML la pagina aspetta solo la sessione (serve a scegliere
// quale home mostrare). Ogni sezione con dati fa le sue query dentro un
// `<Suspense>`: le boundary partono in parallelo e ognuna arriva in streaming
// appena pronta, mentre hero e testi statici sono subito a schermo. Senza,
// le query andavano in fila e la pagina compariva tutta insieme alla fine,
// lentissima quando il database era sospeso (avvio a freddo Neon).
export default async function HomePage() {
  const [t, userSession] = await Promise.all([getTranslations("home"), auth()]);
  const storia = t.raw("storia") as StoriaItem[];
  const values = t.raw("values") as ValueItem[];

  const userId = userSession?.user?.id ?? null;
  const appRole = userSession?.user?.appRole ?? null;
  const isStaff = appRole === "COACH" || appRole === "ADMIN";
  // Membri attivi: home "operativa" (allenamenti prima); anonimi/GUEST: home istituzionale
  const isMember =
    appRole === "ATHLETE" || appRole === "PARENT" || appRole === "COACH" || appRole === "ADMIN";

  // Il Container #allenamenti resta fuori dal Suspense: è l'ancora della CTA
  // della hero e deve esistere prima che arrivino i dati.
  const sessionsBlock = (
    <Container id="allenamenti" maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Suspense fallback={<HomeSectionSkeleton variant="sessions" />}>
        <HomeSessions userId={userId} isMember={isMember} isStaff={isStaff} />
      </Suspense>
    </Container>
  );

  const matchesBlock = (
    <Suspense fallback={<HomeSectionSkeleton variant="matches" />}>
      <ProssimePartiteHome />
    </Suspense>
  );

  const newsBlock = (
    <Suspense fallback={<HomeSectionSkeleton variant="news" />}>
      <LatestNewsHero />
    </Suspense>
  );

  // ── Chi siamo (valori + storia) — mostrato in fondo a tutti ──────────────
  const chiSiamoBlock = (
    <Box
      sx={{
        bgcolor: "action.hover",
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "divider",
        py: { xs: 6, md: 9 },
      }}
    >
      <Container maxWidth="md">
        {/* Valori */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="overline"
            color="primary.onLight"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("whoWeAre")}
          </Typography>
          <Typography
            variant="h4"
            component="h2"
            fontWeight={800}
            sx={{ mt: 0.5, mb: 3, fontSize: { xs: "1.6rem", md: "2rem" } }}
          >
            {t("whatWeBelieve")}
          </Typography>
          <Grid container spacing={2}>
            {[FavoriteIcon, GroupsIcon, EmojiEventsIcon, LocationOnIcon].map((Icon, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{ p: 3, border: "1px solid", borderColor: "divider", height: "100%" }}
                >
                  <Box sx={{ color: "primary.main", mb: 1.5 }}>
                    <Icon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h6" component="h3" fontWeight={700} sx={{ mb: 1 }}>
                    {values[i]?.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {values[i]?.body}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ mb: 8 }} />

        {/* Storia */}
        <Box>
          <Typography
            variant="overline"
            color="primary.onLight"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("ourHistory")}
          </Typography>
          <Typography
            variant="h4"
            component="h2"
            fontWeight={800}
            sx={{ mt: 0.5, mb: 3, fontSize: { xs: "1.6rem", md: "2rem" } }}
          >
            {t("tenYears")}
          </Typography>
          <Stack spacing={0}>
            {storia.map((item, i) => (
              <Box key={item.anno} sx={{ display: "flex", gap: 3 }}>
                {/* Timeline line */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <StarIcon sx={{ color: "common.white", fontSize: 18 }} />
                  </Box>
                  {i < storia.length - 1 && (
                    // Server Component: niente sx a funzione (non serializzabile) →
                    // token stringa theme-aware per la linea della timeline
                    <Box sx={{ width: 2, flex: 1, bgcolor: "divider", my: 0.5 }} />
                  )}
                </Box>
                {/* Content */}
                <Box sx={{ pb: i < storia.length - 1 ? 4 : 0 }}>
                  <Typography
                    variant="caption"
                    color="primary.onLight"
                    fontWeight={700}
                    sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
                  >
                    {item.anno}
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    component="h3"
                    fontWeight={700}
                    sx={{ mt: 0.25, mb: 0.75 }}
                  >
                    {item.titolo}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.75, maxWidth: 560 }}
                  >
                    {item.testo}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );

  // Home operativa per i membri: hero + prima gli allenamenti e le cose da fare
  if (isMember) {
    return (
      <>
        <JsonLd data={organizationJsonLd()} />
        {/* Banner che il più delle volte non c'è: niente skeleton, compaiono
            solo se servono. */}
        <Suspense fallback={null}>
          <BirthdayBanner />
        </Suspense>
        <HeroSection />
        {userId && (
          <Suspense fallback={null}>
            <PendingAvailabilityBanner userId={userId} />
          </Suspense>
        )}
        {sessionsBlock}
        {matchesBlock}
        {newsBlock}
        <LoSapeviCard />
        {chiSiamoBlock}
      </>
    );
  }

  // Home istituzionale per anonimi e GUEST
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      {appRole === "GUEST" && (
        <Container maxWidth="md" sx={{ pt: 2 }}>
          <GuestWelcomeBanner />
        </Container>
      )}
      <HeroSection />

      {newsBlock}

      {matchesBlock}

      {sessionsBlock}

      <LoSapeviCard />

      {chiSiamoBlock}

      <JoinUsCta />
    </>
  );
}
