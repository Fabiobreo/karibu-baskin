import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/authjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Breadcrumbs,
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Stack,
  Button,
  Badge,
  Skeleton,
  Link as MuiLink,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import Link from "next/link";
import { contrastText } from "@/lib/colorUtils";
import type { AppRole } from "@prisma/client";
import ParentChildLinker, { type ChildData } from "@/components/profile/ParentChildLinker";
import NotificationPrefsPanel from "@/components/profile/NotificationPrefsPanel";
import { mergePrefs } from "@/lib/notifications/notifPrefs";
import LinkRequestsSection from "@/components/profile/LinkRequestsSection";
import ClaimAnonymousCard from "@/components/training/ClaimAnonymousCard";
import GuestOnboardingSection from "@/components/common/GuestOnboardingSection";
import ProfileNameEditor from "@/components/profile/ProfileNameEditor";
import ProfileTabs from "@/components/profile/ProfileTabs";
import AthleteInfoSection from "@/components/profile/AthleteInfoSection";
import AttendanceSection from "@/components/profile/AttendanceSection";
import GdprSection from "@/components/profile/GdprSection";
import { countPendingAvailabilities } from "@/lib/matches/myAvailabilities";
import { getCurrentSeason } from "@/lib/season/seasonUtils";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import ProfileAvatarEditor from "@/components/profile/ProfileAvatarEditor";
import ProfileBadges from "@/components/profile/ProfileBadges";
import { buildMetadata } from "@/lib/seo";
import PageHero from "@/components/common/PageHero";
import NextTrainingCard, {
  type NextTrainingInfo,
  type TrainingSubject,
} from "@/components/profile/NextTrainingCard";
import { checkRegistrationAllowed } from "@/lib/registrationRestrictions";

export const metadata = buildMetadata({
  title: "Il mio profilo",
  description: "Il tuo profilo sul sito del Karibu Baskin.",
  path: "/profilo",
  noindex: true,
});

export const revalidate = 0;

const APP_ROLE_CHIP_COLOR: Record<
  AppRole,
  "default" | "primary" | "success" | "warning" | "error"
> = {
  GUEST: "default",
  ATHLETE: "primary",
  PARENT: "success",
  COACH: "warning",
  ADMIN: "error",
};

// Le attese indipendenti vanno in parallelo, e i badge (la parte più costosa:
// statistiche, MVP e rose di ogni giocatore) arrivano in streaming dentro
// `<Suspense>`. Il controllo di sessione resta prima di tutto, così `redirect`
// è un vero redirect HTTP e non uno lato client a stream già partito.
export default async function ProfiloPage() {
  const [t, session] = await Promise.all([getTranslations("profile"), auth()]);
  if (!session?.user?.id) redirect("/login");

  const userQuery = prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      children: {
        orderBy: { createdAt: "asc" as const },
        select: {
          id: true,
          name: true,
          sportRole: true,
          sportRoleVariant: true,
          gender: true,
          birthDate: true,
          userId: true,
          user: { select: { email: true, image: true } },
          teamMemberships: {
            include: { team: { select: { name: true, color: true, season: true } } },
          },
        },
      },
      childAccount: {
        select: { _count: { select: { registrations: true } } },
      },
      sportRoleHistory: {
        orderBy: { changedAt: "desc" },
        take: 5,
        select: { sportRole: true, changedAt: true },
      },
      teamMemberships: {
        include: { team: { select: { name: true, color: true, season: true } } },
      },
      registrations: {
        select: { session: { select: { date: true } } },
      },
      _count: { select: { registrations: true } },
      // Con Google il nome arriva da lì e viene riscritto a ogni accesso: si
      // modifica dal profilo solo senza account Google (magic link).
      accounts: { where: { provider: "google" }, select: { id: true }, take: 1 },
    },
  });

  const [user, pendingAvailabilities, currentSeason] = await Promise.all([
    userQuery,
    countPendingAvailabilities(session.user.id),
    getCurrentSeasonLabel(),
  ]);

  if (!user) redirect("/login");

  // ── Prossimo allenamento ──────────────────────────────────────────────────
  // È il motivo principale per cui un atleta apre il sito, e nel profilo non
  // c'era. Per un genitore le righe sono quelle dei figli collegati.
  const childIds = user.children.map((c) => c.id);
  const nextSessionQuery = prisma.trainingSession.findFirst({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
    select: {
      id: true,
      title: true,
      date: true,
      dateSlug: true,
      registrationOpen: true,
      allowedRoles: true,
      restrictTeamId: true,
      openRoles: true,
      team: { select: { name: true } },
      registrations: {
        where: {
          OR: [
            { userId: user.id },
            ...(childIds.length > 0 ? [{ childId: { in: childIds } }] : []),
          ],
        },
        select: { id: true, userId: true, childId: true },
      },
    },
  });

  // Iscrizioni anonime con stesso nome (per proposta di collegamento)
  const anonymousMatchesQuery = user.name
    ? prisma.registration.findMany({
        where: {
          userId: null,
          childId: null,
          name: { equals: user.name.trim(), mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          session: { select: { id: true, title: true, date: true, dateSlug: true } },
        },
      })
    : [];

  const [nextSession, anonymousMatches] = await Promise.all([
    nextSessionQuery,
    anonymousMatchesQuery,
  ]);

  const effectiveRole = session.user.appRole as AppRole;
  const isParent = effectiveRole === "PARENT" || effectiveRole === "ADMIN";
  const isAthlete =
    effectiveRole === "ATHLETE" || effectiveRole === "COACH" || effectiveRole === "ADMIN";

  const currentTeams = user.teamMemberships.filter((m) => m.team.season === currentSeason);

  // Presenze per stagione
  const attendanceBySeason = user.registrations.reduce<Record<string, number>>((acc, reg) => {
    const season = getCurrentSeason(reg.session.date);
    acc[season] = (acc[season] ?? 0) + 1;
    return acc;
  }, {});
  const attendanceSeasons = Object.entries(attendanceBySeason).sort(([a], [b]) =>
    b.localeCompare(a)
  );

  let nextTraining: NextTrainingInfo | null = null;
  let trainingSubjects: TrainingSubject[] = [];
  if (nextSession) {
    const restrictions = {
      allowedRoles: nextSession.allowedRoles,
      restrictTeamId: nextSession.restrictTeamId,
      openRoles: nextSession.openRoles,
    };
    const inRestrictedTeam = (memberships: { teamId: string }[]) =>
      restrictions.restrictTeamId === null ||
      memberships.length === 0 || // nessuna squadra → bypass, come fa l'API
      memberships.some((m) => m.teamId === restrictions.restrictTeamId);

    const subjects: TrainingSubject[] = [];
    if (isAthlete) {
      const check = checkRegistrationAllowed(
        restrictions,
        effectiveRole,
        user.sportRole ?? 0,
        inRestrictedTeam(user.teamMemberships)
      );
      subjects.push({
        kind: "user",
        id: user.id,
        name: user.name ?? "",
        sportRole: user.sportRole,
        registrationId: nextSession.registrations.find((r) => r.userId === user.id)?.id ?? null,
        allowed: check.allowed,
        reason: check.reason ?? null,
      });
    }
    for (const child of user.children) {
      const check = checkRegistrationAllowed(
        restrictions,
        "ATHLETE",
        child.sportRole ?? 0,
        inRestrictedTeam(child.teamMemberships)
      );
      subjects.push({
        kind: "child",
        id: child.id,
        name: child.name,
        sportRole: child.sportRole,
        registrationId: nextSession.registrations.find((r) => r.childId === child.id)?.id ?? null,
        allowed: check.allowed,
        reason: check.reason ?? null,
      });
    }

    if (subjects.length > 0) {
      nextTraining = {
        id: nextSession.id,
        title: nextSession.title,
        date: nextSession.date.toISOString(),
        href: `/allenamento/${nextSession.dateSlug ?? nextSession.id}`,
        registrationOpen: nextSession.registrationOpen,
        teamName: nextSession.team?.name ?? null,
      };
      trainingSubjects = subjects;
    }
  }

  // Segnaposto dei badge: stesso Paper outlined di BadgeShowcase.
  const badgesSkeleton = <Skeleton variant="rounded" height={180} sx={{ mb: 3 }} />;

  // ── Contenuto tab "Profilo": card principale + dati atleta + presenze ──
  const profileTab = (
    <>
      {nextTraining ? (
        <NextTrainingCard training={nextTraining} subjects={trainingSubjects} />
      ) : (
        // La domanda "quando è il prossimo allenamento?" deve avere una
        // risposta anche quando la risposta è "nessuno".
        <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <CalendarMonthIcon sx={{ fontSize: 20, color: "text.disabled" }} />
            <Typography
              variant="overline"
              fontWeight={800}
              color="text.secondary"
              sx={{ letterSpacing: "0.08em" }}
            >
              {t("nextTraining")}
            </Typography>
          </Box>
          <Typography variant="body2" fontWeight={700}>
            {t("nextTrainingNone")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("nextTrainingNoneDesc")}
          </Typography>
        </Paper>
      )}

      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
          <ProfileAvatarEditor
            googleImage={user.image ?? null}
            customImage={user.customImage ?? null}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ProfileNameEditor name={user.name} editable={user.accounts.length === 0} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {user.email}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Chip
            label={t(`appRole${user.appRole as AppRole}`)}
            color={APP_ROLE_CHIP_COLOR[user.appRole as AppRole]}
            size="small"
            sx={{ fontWeight: 600 }}
          />
          {currentTeams.map((m) => (
            <Chip
              key={m.id}
              label={m.team.name}
              size="small"
              sx={{
                fontWeight: 700,
                bgcolor: m.team.color ?? "primary.main",
                color: contrastText(m.team.color),
              }}
            />
          ))}
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
          {user.slug && (
            <Link href={`/giocatori/${user.slug}`} style={{ textDecoration: "none" }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<OpenInNewIcon sx={{ fontSize: "0.9rem !important" }} />}
                sx={{ fontSize: "0.78rem", fontWeight: 600 }}
              >
                {t("publicProfile")}
              </Button>
            </Link>
          )}
          <Link href="/profilo/disponibilita" style={{ textDecoration: "none" }}>
            <Badge badgeContent={pendingAvailabilities} color="warning" max={99}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EventAvailableIcon sx={{ fontSize: "0.9rem !important" }} />}
                sx={{ fontSize: "0.78rem", fontWeight: 600 }}
              >
                {t("myAvailabilities")}
              </Button>
            </Badge>
          </Link>
        </Stack>

        {user.appRole === "GUEST" && (
          <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1.5 }}>
            {t("guestPending")}
          </Typography>
        )}
      </Paper>

      {isAthlete && (
        <AthleteInfoSection
          sportRole={user.sportRole}
          gender={user.gender}
          birthDate={user.birthDate}
          roleHistory={user.sportRoleHistory}
        />
      )}

      {/* Badge dell'utente (solo atleti) */}
      {isAthlete && (
        <Box sx={{ mb: 3 }}>
          <Suspense fallback={badgesSkeleton}>
            <ProfileBadges
              player={{ userId: user.id }}
              title={t("achievements")}
              nextTitle={t("nextAchievements")}
              emptyLabel={t("noAchievementsYet")}
            />
          </Suspense>
          <Box sx={{ mt: -1.5, textAlign: "right" }}>
            <Link href="/profilo/traguardi" style={{ textDecoration: "none" }}>
              <Button
                size="small"
                endIcon={<EmojiEventsIcon sx={{ fontSize: "1rem !important" }} />}
              >
                {t("viewAllAchievements")}
              </Button>
            </Link>
          </Box>
        </Box>
      )}

      {/* Le presenze erano già calcolate ma comparivano solo con più di una
          stagione alle spalle: per chi è al primo anno sparivano del tutto. */}
      <AttendanceSection seasons={attendanceSeasons} currentSeason={currentSeason} />
    </>
  );

  // ── Contenuto tab "Famiglia" (solo PARENT/ADMIN) ──
  const familyTab = isParent ? (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {t("myChildren")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("linkChildDesc")}
      </Typography>
      <ParentChildLinker
        initialChildren={user.children as ChildData[]}
        currentSeason={currentSeason}
      />
    </Paper>
  ) : null;

  // Badge dei figli (tab Famiglia). Senza `emptyLabel` BadgeShowcase non
  // mostra nulla per un figlio senza badge né traguardi vicini.
  const childBadgesTab =
    isParent && user.children.length > 0 ? (
      <>
        {user.children.map((c) => (
          <Suspense key={c.id} fallback={badgesSkeleton}>
            <ProfileBadges
              player={{ childId: c.id }}
              title={t("childAchievements", { name: c.name })}
              nextTitle={t("nextAchievements")}
            />
          </Suspense>
        ))}
      </>
    ) : null;

  // ── Contenuto tab "Notifiche" ──
  const notificationsTab = (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {t("notificationsSection")}
      </Typography>
      <NotificationPrefsPanel initialPrefs={mergePrefs(user.notifPrefs)} />
    </Paper>
  );

  return (
    <>
      {/* Stesso schema delle pagine pubbliche: passando da /squadre a /profilo
          non deve sembrare un altro sito. */}
      <PageHero
        chip={t("heroChip")}
        title={t("title")}
        subtitle={t("heroSubtitle")}
        subtitleMaxWidth={540}
        breadcrumb={
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{ "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.4)" } }}
          >
            {/* Niente `component={Link}`: qui siamo in un Server Component e
                passare un componente a un Client Component non attraversa il
                confine RSC. Resta un'ancora normale. */}
            <MuiLink
              href="/"
              underline="hover"
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "common.white" } }}
            >
              {t("breadcrumbHome")}
            </MuiLink>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
              {t("title")}
            </Typography>
          </Breadcrumbs>
        }
      />

      {/* `md` come tutte le altre pagine: con `sm` su 1440px restava una
          strisciolina centrale da 600px. */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        {user.appRole === "GUEST" && (
          <Box sx={{ mb: 3 }}>
            {/* Stessa card della home: finché lo staff non conferma, il
                profilo mostra a che punto è l'utente e cosa può già fare. */}
            <Suspense fallback={null}>
              <GuestOnboardingSection userId={user.id} />
            </Suspense>
          </Box>
        )}

        {anonymousMatches.length > 0 && (
          <ClaimAnonymousCard
            registrations={anonymousMatches.map((r) => ({
              id: r.id,
              title: r.session.title,
              date: r.session.date,
              dateSlug: r.session.dateSlug,
            }))}
          />
        )}

        {/* Richieste di collegamento in attesa — sopra le tab, si nasconde da sola se vuota */}
        <LinkRequestsSection />

        <ProfileTabs
          profile={profileTab}
          family={
            familyTab || childBadgesTab ? (
              <>
                {familyTab}
                {childBadgesTab}
              </>
            ) : null
          }
          notifications={notificationsTab}
          privacy={<GdprSection email={user.email} />}
        />
      </Container>
    </>
  );
}
