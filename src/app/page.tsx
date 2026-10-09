import { Suspense } from "react";
import { auth } from "@/lib/authjs";
import { getTranslations } from "next-intl/server";
import { Container, Box, Divider } from "@mui/material";
import HomeSessions from "@/components/training/HomeSessions";
import HomeSectionSkeleton from "@/components/common/HomeSectionSkeleton";
import JoinUsCta from "@/components/common/JoinUsCta";
import JsonLd from "@/components/common/JsonLd";
import { organizationJsonLd } from "@/lib/structuredData";
import HeroSection from "@/components/common/HeroSection";
import LatestNewsHero from "@/components/news/LatestNewsHero";
import LoSapeviCard from "@/components/common/LoSapeviCard";
import ProssimePartiteHome from "@/components/matches/ProssimePartiteHome";
import ClubValues from "@/components/common/ClubValues";
import ClubHistory from "@/components/common/ClubHistory";
import BirthdayBanner from "@/components/common/BirthdayBanner";
import GuestOnboardingSection from "@/components/common/GuestOnboardingSection";
import GuestOnboardingSkeleton from "@/components/common/GuestOnboardingSkeleton";
import PendingAvailabilityBanner from "@/components/matches/PendingAvailabilityBanner";
import NextActionSection from "@/components/common/NextActionSection";
import { showsNextAction } from "@/lib/nextAction";
import { isMemberRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  description:
    "Iscriviti agli allenamenti e scopri le squadre del Karibu Baskin di Montecchio Maggiore.",
  path: "/",
});

export const revalidate = 0;

// Prima di mandare HTML la pagina aspetta solo la sessione (serve a scegliere
// quale home mostrare). Ogni sezione con dati fa le sue query dentro un
// `<Suspense>`: le boundary partono in parallelo e ognuna arriva in streaming
// appena pronta, mentre hero e testi statici sono subito a schermo. Senza,
// le query andavano in fila e la pagina compariva tutta insieme alla fine,
// lentissima quando il database era sospeso (avvio a freddo Neon).
export default async function HomePage() {
  const [t, tGuest, userSession] = await Promise.all([
    getTranslations("home"),
    getTranslations("guestOnboarding"),
    auth(),
  ]);

  const userId = userSession?.user?.id ?? null;
  const appRole = userSession?.user?.appRole ?? null;
  const isStaff = appRole === "COACH" || appRole === "ADMIN";
  // Membri attivi: home "operativa" (allenamenti prima); anonimi/GUEST: home istituzionale
  const isMember = isMemberRole(appRole);

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
        // Pesca: superficie di marchio chiara, non interattiva (01/10).
        bgcolor: "warmSurface.bg",
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "warmSurface.border",
        py: { xs: 6, md: 9 },
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: 8 }}>
          <ClubValues />
        </Box>

        <Divider sx={{ mb: 8 }} />

        <ClubHistory />
      </Container>
    </Box>
  );

  // Stessa struttura per tutti (UX-16): prevedibile, e genitore e figlio usano
  // spesso lo stesso telefono. Cambia solo cio' che sta in cima: la prossima
  // cosa da fare per atleti e genitori, i primi passi per chi e' in attesa,
  // l'invito a provare per chi non ha fatto l'accesso.
  const firstName = userSession?.user?.name?.trim().split(/\s+/)[0] || null;
  // Lo staff e il dirigente che giocano vedono la card come gli atleti (UX-24):
  // il ruolo Baskin non e' nella sessione, e la query serve solo a loro.
  const ownProfile =
    (isStaff || appRole === "DIRECTOR") && userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { sportRole: true, _count: { select: { guardianOf: true } } },
        })
      : null;
  const showNextAction = showsNextAction(
    appRole,
    ownProfile?.sportRole ?? null,
    (ownProfile?._count.guardianOf ?? 0) > 0
  );
  const isGuest = appRole === "GUEST" && !!userId;
  const memberHead = showNextAction && !!userId && !!appRole;

  // Il Container #allenamenti resta fuori dal Suspense: è l'ancora della CTA
  // della hero e deve esistere prima che arrivino i dati.
  const sessionsBlock = (
    <Container id="allenamenti" maxWidth="lg">
      <Suspense
        fallback={
          // Lo spazio sopra e sotto e' della sezione, che puo' anche non esserci.
          <Box sx={{ py: { xs: 3, md: 5 } }}>
            <HomeSectionSkeleton variant="sessions" />
          </Box>
        }
      >
        <HomeSessions
          userId={userId}
          isMember={isMember}
          isStaff={isStaff}
          // L'allenamento della card in testa non si ripete nella sezione (UX-33).
          headCard={
            memberHead && appRole
              ? { kind: "nextAction", appRole }
              : isGuest
                ? { kind: "guestOnboarding" }
                : null
          }
        />
      </Suspense>
    </Container>
  );

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      {isMember && (
        // Banner che il più delle volte non c'è: niente skeleton.
        <Suspense fallback={null}>
          <BirthdayBanner />
        </Suspense>
      )}

      {/* Tesserati e account in attesa (UX-33): la foto resta, ma l'hero e'
          bassa e ha solo il saluto. La CTA e' la card subito sotto. */}
      {memberHead && userId && appRole ? (
        <>
          <HeroSection
            greeting={firstName ? t("heroHello", { name: firstName }) : t("heroHelloNoName")}
          />
          <Suspense fallback={<GuestOnboardingSkeleton compact />}>
            <NextActionSection userId={userId} appRole={appRole} home />
          </Suspense>
        </>
      ) : isGuest && userId ? (
        <>
          <HeroSection
            greeting={
              firstName ? tGuest("heroGreeting", { name: firstName }) : tGuest("heroGreetingNoName")
            }
          />
          <Suspense fallback={<GuestOnboardingSkeleton />}>
            <GuestOnboardingSection userId={userId} home />
          </Suspense>
        </>
      ) : (
        <>
          <HeroSection visitor={!userId} />
          {/* Staff: le disponibilita' da dare restano in un banner. */}
          {isStaff && userId && (
            <Suspense fallback={null}>
              <PendingAvailabilityBanner userId={userId} />
            </Suspense>
          )}
        </>
      )}

      {sessionsBlock}
      {matchesBlock}
      {newsBlock}
      <LoSapeviCard />
      {chiSiamoBlock}

      {/* L'invito a unirsi e' solo per chi non ha ancora un account. */}
      {!userId && <JoinUsCta />}
    </>
  );
}
