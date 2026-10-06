import {
  ROLE_CHIP_ICONS,
  appRoleChipSx,
  appRoleChipVariant,
} from "@/components/common/appRoleIcons";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/authjs";
import { redirect } from "next/navigation";
import { loginHref } from "@/lib/loginReturn";
import { prisma } from "@/lib/db";
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Stack,
  Avatar,
  Button,
  Badge,
  Skeleton,
} from "@mui/material";
import { columnSx } from "@/lib/layout";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TeamChip from "@/components/teams/TeamChip";
import ChipIconLabel from "@/components/common/ChipIconLabel";

import type { AppRole } from "@prisma/client";
import ParentChildLinker, { type ChildData } from "@/components/profile/ParentChildLinker";
import NotificationPrefsPanel from "@/components/profile/NotificationPrefsPanel";
import { mergePrefs } from "@/lib/notifications/notifPrefs";
import LinkRequestsSection from "@/components/profile/LinkRequestsSection";
import ClaimAnonymousCard from "@/components/training/ClaimAnonymousCard";
import { showsNextAction } from "@/lib/nextAction";
import GuestOnboardingSection from "@/components/common/GuestOnboardingSection";
import NextActionSection from "@/components/common/NextActionSection";
import ProfileNameEditor from "@/components/profile/ProfileNameEditor";
import ProfileTabs from "@/components/profile/ProfileTabs";
import AthleteInfoSection from "@/components/profile/AthleteInfoSection";
import AttendanceSection from "@/components/profile/AttendanceSection";
import GdprSection from "@/components/profile/GdprSection";
import { countPendingAvailabilities } from "@/lib/matches/myAvailabilities";
import { showsAvailabilities } from "@/lib/matches/availabilityAudience";
import { getCurrentSeason } from "@/lib/season/seasonUtils";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import ProfileAvatarEditor from "@/components/profile/ProfileAvatarEditor";
import ProfileBadges from "@/components/profile/ProfileBadges";
import { buildMetadata } from "@/lib/seo";
import PageHeader from "@/components/common/PageHeader";
import NextTrainingCard, {
  type NextTrainingInfo,
  type TrainingSubject,
} from "@/components/profile/NextTrainingCard";
import { checkRegistrationAllowed } from "@/lib/registrationRestrictions";
import { userHasPublicProfile } from "@/lib/publicProfile";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export const metadata = buildMetadata({
  title: "Il mio profilo",
  description: "Il tuo profilo sul sito del Karibu Baskin.",
  path: "/profilo",
  noindex: true,
});

export const revalidate = 0;

// Le attese indipendenti vanno in parallelo, e i badge (la parte più costosa:
// statistiche, MVP e rose di ogni giocatore) arrivano in streaming dentro
// `<Suspense>`. Il controllo di sessione resta prima di tutto, così `redirect`
// è un vero redirect HTTP e non uno lato client a stream già partito.
export default async function ProfiloPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [t, session, { tab }] = await Promise.all([
    getTranslations("profile"),
    auth(),
    searchParams,
  ]);
  if (!session?.user?.id) {
    // Dopo l'accesso si torna alla scheda chiesta (es. dalla guida: `?tab=notifiche`).
    const wanted = typeof tab === "string" && /^[a-z]+$/.test(tab) ? `?tab=${tab}` : "";
    redirect(loginHref(`/profilo${wanted}`));
  }

  const userQuery = prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      // Figli di cui l'utente è uno dei genitori (vedi @/lib/guardians).
      guardianOf: {
        orderBy: { createdAt: "asc" as const },
        select: {
          child: {
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
              guardians: {
                where: { userId: { not: session.user.id } },
                orderBy: { createdAt: "asc" as const },
                select: { user: { select: { name: true } } },
              },
            },
          },
        },
      },
      childAccount: {
        select: {
          id: true,
          _count: { select: { registrations: true } },
          // Chi è figlio di qualcuno (scheda figlio legata all'account) vede
          // nella tab Famiglia i suoi genitori e, attraverso di loro, fratelli
          // e sorelle: gli altri figli di almeno uno dei suoi genitori.
          guardians: {
            orderBy: { createdAt: "asc" as const },
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  customImage: true,
                  guardianOf: {
                    select: {
                      child: {
                        select: {
                          id: true,
                          name: true,
                          gender: true,
                          user: { select: { image: true, customImage: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
      _count: { select: { registrations: true, matchStats: true } },
    },
  });

  const [user, sentLinkRequests, pendingAvailabilities, currentSeason] = await Promise.all([
    userQuery,
    // Richieste di collegamento inviate e ancora senza risposta: senza, dopo
    // un ricaricamento il figlio "in attesa" sembrava non collegato.
    prisma.linkRequest.findMany({
      where: {
        parentId: session.user.id,
        status: "PENDING",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        childId: true,
        targetUser: { select: { name: true, image: true, customImage: true } },
      },
    }),
    // Chi non può avere partite a cui rispondere non ha il bottone (UX-46).
    session.user.showsAvailabilities ? countPendingAvailabilities(session.user.id) : 0,
    getCurrentSeasonLabel(),
  ]);

  if (!user) redirect("/login");
  const children = user.guardianOf.map(({ child: { guardians, ...child } }) => ({
    ...child,
    otherGuardians: guardians.map((g) => g.user.name ?? "?"),
    pendingRequestId: sentLinkRequests.find((r) => r.childId === child.id)?.id ?? null,
  }));
  // Figli con account che non hanno ancora accettato: non hanno una scheda.
  const pendingLinks = sentLinkRequests
    .filter((r) => r.childId === null)
    .map((r) => ({
      requestId: r.id,
      name: r.targetUser.name,
      image: r.targetUser.customImage ?? r.targetUser.image,
    }));

  // ── Prossimo allenamento ──────────────────────────────────────────────────
  // È il motivo principale per cui un atleta apre il sito, e nel profilo non
  // c'era. Per un genitore le righe sono quelle dei figli collegati.
  const childIds = children.map((c) => c.id);
  // Chi vede la card "prossima cosa da fare" non usa questa query (UX-24), e
  // nemmeno l'ospite: l'allenamento sta nei suoi primi passi (UX-46).
  const showNextAction = showsNextAction(user.appRole, user.sportRole);
  const isGuest = user.appRole === "GUEST";
  const nextSessionQuery =
    showNextAction || isGuest
      ? null
      : prisma.trainingSession.findFirst({
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
    for (const child of children) {
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

    // L'allenamento c'è anche se non c'è nessuno da iscrivere: "nessun
    // allenamento in programma" vale solo quando manca davvero (UX-46).
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

  // Segnaposto dei badge: stesso Paper outlined di BadgeShowcase.
  const badgesSkeleton = <Skeleton variant="rounded" height={180} sx={{ mb: 3 }} />;

  // ── Contenuto tab "Profilo": card principale + dati atleta + presenze ──
  // "Ti riconosco!": dopo identita' e prossima azione (UX-16).
  const claimCard = anonymousMatches.length > 0 && (
    <ClaimAnonymousCard
      registrations={anonymousMatches.map((r) => ({
        id: r.id,
        title: r.session.title,
        date: r.session.date,
        dateSlug: r.session.dateSlug,
      }))}
    />
  );

  const AppRoleIcon = ROLE_CHIP_ICONS[user.appRole as AppRole];
  const profileTab = (
    <>
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
          <ProfileAvatarEditor
            googleImage={user.image ?? null}
            customImage={user.customImage ?? null}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ProfileNameEditor name={user.name} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {user.email}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          {/* Ruolo utente neutro (UX-29): lo distinguono icona e parola, non il colore. */}
          <Chip
            // Icona dentro `label`, non in `icon`: vedi ChipIconLabel.
            label={
              <ChipIconLabel
                icon={<AppRoleIcon sx={{ fontSize: 18 }} />}
                size="small"
                variant={appRoleChipVariant(user.appRole as AppRole)}
              >
                {t(`appRole${user.appRole as AppRole}`)}
              </ChipIconLabel>
            }
            variant={appRoleChipVariant(user.appRole as AppRole)}
            size="small"
            sx={appRoleChipSx(user.appRole as AppRole)}
          />
          {currentTeams.map((m) => (
            <TeamChip key={m.id} name={m.team.name} color={m.team.color} compact />
          ))}
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
          {/* Il genitore che non gioca non ha un profilo pubblico (vedi
              @/lib/publicProfile): niente link verso un 404. */}
          {user.slug &&
            userHasPublicProfile({ ...user, matchesPlayed: user._count.matchStats }) && (
              <Button
                href={`/giocatori/${user.slug}`}
                size="small"
                variant="outlined"
                startIcon={<OpenInNewIcon sx={{ fontSize: "0.9rem !important" }} />}
                sx={{ fontSize: TYPE_SCALE.xs }}
              >
                {t("publicProfile")}
              </Button>
            )}
          {/* Solo a chi può avere partite a cui rispondere: per gli altri la
              pagina sarebbe sempre vuota (UX-46). Contatore su un elemento che
              si tocca: arancio (UX-29). */}
          {showsAvailabilities(user.appRole, user.sportRole, children.length) && (
            <Badge badgeContent={pendingAvailabilities} color="primary" max={99}>
              <Button
                href="/profilo/disponibilita"
                size="small"
                variant="outlined"
                startIcon={<EventAvailableIcon sx={{ fontSize: "0.9rem !important" }} />}
                sx={{ fontSize: TYPE_SCALE.xs }}
              >
                {t("myAvailabilities")}
              </Button>
            </Badge>
          )}
        </Stack>
      </Paper>
      {/* Identita' in cima, poi la prossima cosa da fare (UX-16), poi "Ti
          riconosco!". Atleti, genitori e staff che gioca: la stessa card della
          home; lo staff che non gioca tiene la card del prossimo allenamento.
          L'ospite ha l'allenamento nei primi passi, in cima alla pagina (UX-46). */}
      {isGuest ? null : showNextAction ? (
        <Box sx={{ mb: 3 }}>
          <Suspense fallback={<Skeleton variant="rounded" height={120} />}>
            <NextActionSection userId={user.id} appRole={user.appRole} />
          </Suspense>
        </Box>
      ) : (
        <>
          {nextTraining ? (
            <NextTrainingCard training={nextTraining} subjects={trainingSubjects} />
          ) : (
            // La domanda "quando è il prossimo allenamento?" deve avere una
            // risposta anche quando la risposta è "nessuno".
            <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CalendarMonthIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                <Typography variant="overline" fontWeight={FONT_WEIGHT.bold} color="text.secondary">
                  {t("nextTraining")}
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                {t("nextTrainingNone")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("nextTrainingNoneDesc")}
              </Typography>
            </Paper>
          )}
        </>
      )}
      {claimCard}

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
            <Button
              href="/profilo/traguardi"
              size="small"
              endIcon={<EmojiEventsIcon sx={{ fontSize: "1rem !important" }} />}
            >
              {t("viewAllAchievements")}
            </Button>
          </Box>
        </Box>
      )}

      {/* Le presenze erano già calcolate ma comparivano solo con più di una
          stagione alle spalle: per chi è al primo anno sparivano del tutto. */}
      <AttendanceSection seasons={attendanceSeasons} />
    </>
  );

  // ── Contenuto tab "Famiglia" (solo PARENT/ADMIN) ──
  const familyTab = isParent ? (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography component="h2" variant="subtitle1" gutterBottom>
        {t("myChildren")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("linkChildDesc")}
      </Typography>
      <ParentChildLinker
        initialChildren={children as ChildData[]}
        initialPendingLinks={pendingLinks}
        currentSeason={currentSeason}
      />
    </Paper>
  ) : null;

  // Genitori di chi è figlio (tab Famiglia, per qualunque ruolo): solo nome e
  // foto, lo stesso che la famiglia vede già dall'altra parte.
  const myParents = user.childAccount?.guardians.map((g) => g.user) ?? [];
  const parentsTab =
    myParents.length > 0 ? (
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography component="h2" variant="subtitle1" gutterBottom>
          {t("myParents")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("myParentsDesc")}
        </Typography>
        <Stack spacing={1.5}>
          {myParents.map((p) => (
            <Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar
                src={p.customImage ?? p.image ?? undefined}
                alt={p.name ?? ""}
                sx={{ width: 40, height: 40 }}
              >
                {p.name?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="body1" fontWeight={FONT_WEIGHT.semibold}>
                {p.name ?? t("parentNoName")}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
    ) : null;

  // Fratelli e sorelle: gli altri figli dei miei genitori, una volta sola anche
  // se li abbiamo in comune tutti e due. Solo nome e foto, come per i genitori.
  const ownChildId = user.childAccount?.id;
  const siblings = [
    ...new Map(
      myParents
        .flatMap((p) => p.guardianOf.map((g) => g.child))
        .filter((c) => c.id !== ownChildId)
        .map((c) => [c.id, c] as const)
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "it"));
  // Il titolo segue chi c'e': "Mia sorella", "I miei fratelli", o tutti e due.
  const siblingsKind = siblings.every((s) => s.gender === "MALE")
    ? "brothers"
    : siblings.every((s) => s.gender === "FEMALE")
      ? "sisters"
      : "mixed";
  const siblingsTab =
    siblings.length > 0 ? (
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography component="h2" variant="subtitle1" gutterBottom>
          {t("mySiblings", { kind: siblingsKind, count: siblings.length })}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("mySiblingsDesc")}
        </Typography>
        <Stack spacing={1.5}>
          {siblings.map((s) => (
            <Box key={s.id} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar
                src={s.user?.customImage ?? s.user?.image ?? undefined}
                alt=""
                sx={{ width: 40, height: 40 }}
              >
                {s.name[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={FONT_WEIGHT.semibold}>
                  {s.name}
                </Typography>
                {/* Con il titolo misto la parola dice chi e' chi; senza il
                    genere non si indovina. */}
                {siblingsKind === "mixed" && s.gender && (
                  <Typography variant="caption" color="text.secondary">
                    {t(s.gender === "MALE" ? "siblingBrother" : "siblingSister")}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Stack>
      </Paper>
    ) : null;

  // Badge dei figli (tab Famiglia). Senza `emptyLabel` BadgeShowcase non
  // mostra nulla per un figlio senza badge né traguardi vicini.
  const childBadgesTab =
    isParent && children.length > 0 ? (
      <>
        {children.map((c) => (
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
      <Typography component="h2" variant="subtitle1" gutterBottom>
        {t("notificationsSection")}
      </Typography>
      <NotificationPrefsPanel initialPrefs={mergePrefs(user.notifPrefs)} />
    </Paper>
  );

  return (
    <>
      {/* `md` come tutte le altre pagine: con `sm` su 1440px restava una
          strisciolina centrale da 600px. */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={columnSx("main")}>
          <PageHeader
            title={t("title")}
            subtitle={t("heroSubtitle")}
            breadcrumb={[{ label: t("breadcrumbHome"), href: "/" }, { label: t("title") }]}
          />
          {user.appRole === "GUEST" && (
            <Box sx={{ mb: 3 }}>
              {/* Stessa card della home: finché lo staff non conferma, il
                profilo mostra a che punto è l'utente e cosa può già fare. */}
              <Suspense fallback={null}>
                <GuestOnboardingSection userId={user.id} />
              </Suspense>
            </Box>
          )}

          {/* Richieste di collegamento in attesa — sopra le tab, si nasconde da sola se vuota */}
          <LinkRequestsSection />

          <ProfileTabs
            profile={profileTab}
            family={
              parentsTab || siblingsTab || familyTab || childBadgesTab ? (
                <>
                  {parentsTab}
                  {siblingsTab}
                  {familyTab}
                  {childBadgesTab}
                </>
              ) : null
            }
            notifications={notificationsTab}
            privacy={<GdprSection email={user.email} />}
          />
        </Box>
      </Container>
    </>
  );
}
