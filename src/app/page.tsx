import { prisma } from "@/lib/db";
import { auth } from "@/lib/authjs";
import { getTranslations } from "next-intl/server";
import { Container, Typography, Box, Grid2 as Grid, Paper, Divider, Stack } from "@mui/material";
import HomeSessionsSection from "@/components/training/HomeSessionsSection";
import type { SessionWithCount } from "@/components/training/SessionCard";
import SiteHeader from "@/components/layout/SiteHeader";
import { parseTeamsData } from "@/lib/schemas";
import HeroSection from "@/components/common/HeroSection";
import LatestNewsHero from "@/components/news/LatestNewsHero";
import LoSapeviCard from "@/components/common/LoSapeviCard";
import ProssimePartiteHome from "@/components/matches/ProssimePartiteHome";
import BirthdayBanner from "@/components/common/BirthdayBanner";
import GuestWelcomeBanner from "@/components/common/GuestWelcomeBanner";
import PendingAvailabilityBanner from "@/components/matches/PendingAvailabilityBanner";
import { countPendingAvailabilities } from "@/lib/availabilityPending";
import FavoriteIcon from "@mui/icons-material/Favorite";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import StarIcon from "@mui/icons-material/Star";

export const revalidate = 0;

type StoriaItem = { anno: string; titolo: string; testo: string };
type ValueItem = { title: string; body: string };

export default async function HomePage() {
  const t = await getTranslations("home");
  const storia = t.raw("storia") as StoriaItem[];
  const values = t.raw("values") as ValueItem[];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const userSession = await auth();
  const userId = userSession?.user?.id ?? null;
  const appRole = userSession?.user?.appRole ?? null;
  const isStaff = appRole === "COACH" || appRole === "ADMIN";
  // Membri attivi: home "operativa" (allenamenti prima); anonimi/GUEST: home istituzionale
  const isMember =
    appRole === "ATHLETE" || appRole === "PARENT" || appRole === "COACH" || appRole === "ADMIN";

  const rawSessions = await prisma.trainingSession.findMany({
    where: { date: { gte: startOfToday } },
    orderBy: { date: "asc" },
    include: {
      _count: { select: { registrations: true } },
      restrictTeam: { select: { id: true, name: true, color: true } },
    },
  });

  const sessions = rawSessions.map((s) => ({
    ...s,
    teams: parseTeamsData(s.teams),
  })) satisfies SessionWithCount[];

  const inCorso = sessions.filter((s) => {
    const start = new Date(s.date);
    const end = s.endTime ? new Date(s.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now >= start && now <= end;
  });

  const allUpcoming = sessions.filter((s) => new Date(s.date) > now);

  // Mostra 2 prossimi se stesso giorno, altrimenti solo 1
  const first = allUpcoming[0] ?? null;
  const second = allUpcoming[1] ?? null;
  const sameDay =
    first && second && new Date(first.date).toDateString() === new Date(second.date).toDateString();
  const upcoming = sameDay ? [first, second] : first ? [first] : [];

  // Recupera le iscrizioni dell'utente per le sessioni visibili
  let registrationIdBySession: Record<string, string> = {};
  const visibleIds = [...inCorso, ...upcoming].map((s) => s.id);
  if (userId && visibleIds.length > 0) {
    const regs = await prisma.registration.findMany({
      where: { userId, sessionId: { in: visibleIds } },
      select: { id: true, sessionId: true },
    });
    registrationIdBySession = Object.fromEntries(regs.map((r) => [r.sessionId, r.id]));
  }

  const pendingAvailabilities = isMember && userId ? await countPendingAvailabilities(userId) : 0;

  const sessionsBlock = (
    <Container id="allenamenti" maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <HomeSessionsSection
        inCorso={inCorso}
        upcoming={upcoming}
        registrationIdBySession={registrationIdBySession}
        isStaff={isStaff}
      />
    </Container>
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
            color="primary"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("whoWeAre")}
          </Typography>
          <Typography
            variant="h4"
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
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
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
            color="primary"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em" }}
          >
            {t("ourHistory")}
          </Typography>
          <Typography
            variant="h4"
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
                    <StarIcon sx={{ color: "#fff", fontSize: 18 }} />
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
                    color="primary"
                    fontWeight={700}
                    sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
                  >
                    {item.anno}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.25, mb: 0.75 }}>
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
        <SiteHeader />
        <BirthdayBanner />
        <HeroSection />
        <PendingAvailabilityBanner count={pendingAvailabilities} />
        {sessionsBlock}
        <ProssimePartiteHome />
        <LatestNewsHero />
        <LoSapeviCard />
        {chiSiamoBlock}
      </>
    );
  }

  // Home istituzionale per anonimi e GUEST
  return (
    <>
      <SiteHeader />
      {appRole === "GUEST" && (
        <Container maxWidth="md" sx={{ pt: 2 }}>
          <GuestWelcomeBanner />
        </Container>
      )}
      <HeroSection />

      <LatestNewsHero />

      <ProssimePartiteHome />

      {sessionsBlock}

      <LoSapeviCard />

      {chiSiamoBlock}
    </>
  );
}
