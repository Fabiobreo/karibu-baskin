import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/authjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Container, Typography, Box, Paper, Chip, Stack, Button, Badge } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import { contrastText } from "@/lib/colorUtils";
import type { AppRole } from "@prisma/client";
import ParentChildLinker, { type ChildData } from "@/components/profile/ParentChildLinker";
import NotificationPrefsPanel from "@/components/profile/NotificationPrefsPanel";
import { mergePrefs } from "@/lib/notifications/notifPrefs";
import LinkRequestsSection from "@/components/profile/LinkRequestsSection";
import ClaimAnonymousCard from "@/components/training/ClaimAnonymousCard";
import GuestWelcomeBanner from "@/components/common/GuestWelcomeBanner";
import ProfileTabs from "@/components/profile/ProfileTabs";
import AthleteInfoSection from "@/components/profile/AthleteInfoSection";
import AttendanceSection from "@/components/profile/AttendanceSection";
import GdprSection from "@/components/profile/GdprSection";
import { countPendingAvailabilities } from "@/lib/matches/availabilityPending";
import { getCurrentSeason } from "@/lib/season/seasonUtils";
import ProfileAvatarEditor from "@/components/profile/ProfileAvatarEditor";

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

export default async function ProfiloPage() {
  const t = await getTranslations("profile");
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
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
    },
  });

  if (!user) redirect("/login");

  const pendingAvailabilities = await countPendingAvailabilities(user.id);

  const effectiveRole = session.user.appRole as AppRole;
  const isParent = effectiveRole === "PARENT" || effectiveRole === "ADMIN";
  const isAthlete =
    effectiveRole === "ATHLETE" || effectiveRole === "COACH" || effectiveRole === "ADMIN";

  const currentSeason = getCurrentSeason();
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

  // Iscrizioni anonime con stesso nome (per proposta di collegamento)
  const anonymousMatches = user.name
    ? await prisma.registration.findMany({
        where: {
          userId: null,
          childId: null,
          name: { equals: user.name.trim(), mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          session: { select: { id: true, date: true, dateSlug: true } },
        },
      })
    : [];

  // ── Contenuto tab "Profilo": card principale + dati atleta + presenze ──
  const profileTab = (
    <>
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
          <ProfileAvatarEditor
            googleImage={user.image ?? null}
            customImage={user.customImage ?? null}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} noWrap>
              {user.name ?? "—"}
            </Typography>
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

      {attendanceSeasons.length > 1 && (
        <AttendanceSection seasons={attendanceSeasons} currentSeason={currentSeason} />
      )}
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
      <ParentChildLinker initialChildren={user.children as ChildData[]} />
    </Paper>
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
      <SiteHeader />
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          {t("title")}
        </Typography>

        {user.appRole === "GUEST" && (
          <Box sx={{ mb: 3 }}>
            <GuestWelcomeBanner />
          </Box>
        )}

        {anonymousMatches.length > 0 && (
          <ClaimAnonymousCard
            registrations={anonymousMatches.map((r) => ({
              id: r.id,
              date: r.session.date,
              dateSlug: r.session.dateSlug,
            }))}
          />
        )}

        {/* Richieste di collegamento in attesa — sopra le tab, si nasconde da sola se vuota */}
        <LinkRequestsSection />

        <ProfileTabs
          profile={profileTab}
          family={familyTab}
          notifications={notificationsTab}
          privacy={<GdprSection email={user.email} />}
        />
      </Container>
    </>
  );
}
