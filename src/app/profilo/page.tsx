import { getTranslations, getLocale } from "next-intl/server";
import { getDateFnsLocale } from "@/lib/dateLocale";
import { auth } from "@/lib/authjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Container, Typography, Box, Paper, Chip, Divider, Stack, Button } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import { ROLE_COLORS } from "@/lib/constants";
import { contrastText } from "@/lib/colorUtils";
import { getEntityLabels } from "@/lib/entityLabels";
import type { AppRole } from "@prisma/client";
import ParentChildLinker, { type ChildData } from "@/components/profile/ParentChildLinker";
import NotificationPrefsPanel from "@/components/profile/NotificationPrefsPanel";
import { mergePrefs } from "@/lib/notifPrefs";
import LinkRequestsSection from "@/components/profile/LinkRequestsSection";
import ClaimAnonymousCard from "@/components/training/ClaimAnonymousCard";
import { format } from "date-fns";
import { getCurrentSeason } from "@/lib/seasonUtils";
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
  const tPlayers = await getTranslations("players");
  const { roleLabel, genderLabel } = await getEntityLabels();
  const dateLocale = getDateFnsLocale(await getLocale());
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

  const effectiveRole = session.user.appRole as AppRole;
  const isParent = effectiveRole === "PARENT" || effectiveRole === "ADMIN";
  const isAthlete =
    effectiveRole === "ATHLETE" || effectiveRole === "COACH" || effectiveRole === "ADMIN";
  const hasAthleteData = user.sportRole || user.gender || user.birthDate;

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

  return (
    <>
      <SiteHeader />
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          {t("title")}
        </Typography>

        {anonymousMatches.length > 0 && (
          <ClaimAnonymousCard
            registrations={anonymousMatches.map((r) => ({
              id: r.id,
              date: r.session.date,
              dateSlug: r.session.dateSlug,
            }))}
          />
        )}

        {/* Card principale */}
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
            <Chip
              label={t("trainingsCount", {
                count: user._count.registrations + (user.childAccount?._count?.registrations ?? 0),
              })}
              size="small"
              variant="outlined"
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
              <Button
                size="small"
                variant="outlined"
                startIcon={<EventAvailableIcon sx={{ fontSize: "0.9rem !important" }} />}
                sx={{ fontSize: "0.78rem", fontWeight: 600 }}
              >
                {t("myAvailabilities")}
              </Button>
            </Link>
          </Stack>

          {user.appRole === "GUEST" && (
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1.5 }}>
              {t("guestPending")}
            </Typography>
          )}
        </Paper>

        {/* Dati atleta */}
        {isAthlete && (
          <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {tPlayers("athleteInfo")}
            </Typography>

            {hasAthleteData ? (
              <Stack spacing={2}>
                {user.sportRole && (
                  <Row label={tPlayers("baskinRole")}>
                    <Chip
                      label={roleLabel(user.sportRole)}
                      size="small"
                      sx={{
                        bgcolor: ROLE_COLORS[user.sportRole],
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    />
                  </Row>
                )}
                {user.gender && (
                  <Row label={tPlayers("gender")}>
                    <Typography variant="body2">{genderLabel(user.gender)}</Typography>
                  </Row>
                )}
                {user.birthDate && (
                  <Row label={tPlayers("birthDate")}>
                    <Typography variant="body2">
                      {format(new Date(user.birthDate), "d MMMM yyyy", { locale: dateLocale })}
                    </Typography>
                  </Row>
                )}

                {/* Storico ruolo */}
                {user.sportRoleHistory.length > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                        display="block"
                        gutterBottom
                      >
                        {tPlayers("roleHistory")}
                      </Typography>
                      <Stack spacing={0.5}>
                        {user.sportRoleHistory.map((h, i) => (
                          <Typography key={i} variant="caption" color="text.secondary">
                            <Box
                              component="span"
                              sx={{ color: ROLE_COLORS[h.sportRole], fontWeight: 700 }}
                            >
                              {roleLabel(h.sportRole)}
                            </Box>
                            {" · "}
                            {format(new Date(h.changedAt), "d MMM yyyy", { locale: dateLocale })}
                          </Typography>
                        ))}
                      </Stack>
                    </Box>
                  </>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.disabled">
                {t("noAthleteData")}
              </Typography>
            )}
          </Paper>
        )}

        {/* Presenze per stagione */}
        {attendanceSeasons.length > 1 && (
          <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {t("trainingAttendance")}
            </Typography>
            <Stack spacing={1}>
              {attendanceSeasons.map(([season, count]) => (
                <Row key={season} label={t("seasonLabel", { season })}>
                  <Chip
                    label={t("trainingsCount", { count })}
                    size="small"
                    variant={season === currentSeason ? "filled" : "outlined"}
                    color={season === currentSeason ? "primary" : "default"}
                    sx={{ fontWeight: 600 }}
                  />
                </Row>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Richieste di collegamento in attesa */}
        <LinkRequestsSection />

        {/* Notifiche */}
        <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            {t("notificationsSection")}
          </Typography>
          <NotificationPrefsPanel initialPrefs={mergePrefs(user.notifPrefs)} />
        </Paper>

        {/* Sezione figli (solo PARENT e ADMIN) */}
        {isParent && (
          <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {t("myChildren")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("linkChildDesc")}
            </Typography>
            <ParentChildLinker initialChildren={user.children as ChildData[]} />
          </Paper>
        )}

        {/* Export dati personali (GDPR art. 20) */}
        <Box sx={{ mt: 2, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1 }}>
            {t("gdprExportNote")}
          </Typography>
          <a href="/api/users/me/export" download style={{ textDecoration: "none" }}>
            <Button size="small" variant="outlined" sx={{ fontSize: "0.78rem" }}>
              {t("downloadData")}
            </Button>
          </a>
        </Box>

        {/* Eliminazione account (GDPR art. 17) */}
        <Box sx={{ mt: 2, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1 }}>
            {t("gdprDeleteNote")}
          </Typography>
          <Link
            href={`mailto:asdkaribubaskin@gmail.com?subject=${encodeURIComponent("Richiesta eliminazione account GDPR")}&body=${encodeURIComponent(`Salve,\n\nrichiedo l'eliminazione del mio account e di tutti i dati personali associati.\n\nEmail account: ${user.email}\n\nGrazie.`)}`}
          >
            <Button size="small" color="error" variant="outlined" sx={{ fontSize: "0.78rem" }}>
              {t("deleteAccount")}
            </Button>
          </Link>
        </Box>
      </Container>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}
