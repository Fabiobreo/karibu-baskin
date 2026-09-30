"use client";
import { heroBottomBorder, heroGradient, heroText } from "@/lib/heroStyles";
import { useTranslations, useLocale } from "next-intl";
import { Box, Typography, Chip, Breadcrumbs, Link as MuiLink } from "@mui/material";
import TeamColorDot from "@/components/teams/TeamColorDot";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceIcon from "@mui/icons-material/Place";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ScheduleIcon from "@mui/icons-material/Schedule";
import StatusPill from "@/components/common/StatusPill";
import NextLink from "next/link";
import { format } from "date-fns";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import ShareSection from "@/components/common/ShareSection";
import StaffManageButton from "@/components/common/StaffManageButton";
import { mapsSearchUrl, trainingLocation } from "@/lib/clubVenue";
import { sessionEndDate } from "@/lib/dateUtils";
import { formatRoleNumbers } from "@/lib/roleList";
import { SITE_URL } from "@/lib/siteUrl";
import { TYPE_SCALE } from "@/lib/typeScale";

interface Session {
  id: string;
  title: string;
  date: string;
  endTime: string | null;
  location?: string | null;
  dateSlug: string | null;
  allowedRoles: number[];
  restrictTeamId: string | null;
  openRoles: number[];
  restrictTeam: { id: string; name: string; color: string | null } | null;
  registrationOpen: boolean;
  registrationOpenedAt: string | null;
}

interface StatusBadge {
  label: string;
  /** Stati temporali neutri (UX-29): nessuna tinta, li distinguono forma e pallino. */
  variant: "inverted" | "outlined" | "muted";
  pulse?: boolean;
}

function getSessionStatus(
  date: Date,
  endTime: Date | null,
  t: ReturnType<typeof useTranslations>,
  tCommon: ReturnType<typeof useTranslations>
): StatusBadge {
  const now = new Date();
  const end = sessionEndDate(date, endTime);

  // In corso: pastiglia invertita con pallino pulsante, non il verde della
  // vittoria (il verde vuol dire "positivo", non "adesso").
  if (now >= date && now <= end) return { label: t("live"), variant: "inverted", pulse: true };
  if (now > end) return { label: t("ended"), variant: "muted" };

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((sessionDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Oggi: invertita senza pallino. Domani e "tra N giorni": contornate.
  if (diffDays === 0) return { label: t("todayBang"), variant: "inverted" };
  if (diffDays === 1) return { label: tCommon("tomorrow"), variant: "outlined" };
  return { label: tCommon("daysAway", { count: diffDays }), variant: "outlined" };
}

interface Props {
  session: Session;
  sessionDate: Date;
  sessionEnd: Date | null;
  isStaff: boolean;
  countdown: string | null;
}

export default function AllenamientoHero({
  session,
  sessionDate,
  sessionEnd,
  isStaff,
  countdown,
}: Props) {
  const tNav = useTranslations("nav");
  const t = useTranslations("trainings");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const dateLocale = useActiveDateLocale();
  const status = getSessionStatus(sessionDate, sessionEnd, t, tCommon);

  // "Solo ruoli 1 e 5" invece di "Ruolo 1, Ruolo 5": l'elenco lo costruisce un
  // helper, la concordanza la fa il plurale ICU.
  const allowedRolesLabel = session.allowedRoles?.length
    ? t("onlyRoles", {
        count: session.allowedRoles.length,
        roles: formatRoleNumbers(session.allowedRoles, locale),
      })
    : "";

  // Costruito dai dati e non da window.location: sul server l'URL non esiste, e
  // l'href di WhatsApp renderizzato senza link restava tale anche dopo
  // l'idratazione (React non corregge gli attributi in caso di mismatch).
  const sessionUrl = `${SITE_URL}/allenamento/${session.dateSlug ?? session.id}`;

  return (
    <>
      <Box
        style={{
          backgroundImage: heroGradient.dark,
        }}
        sx={{
          ...heroBottomBorder,
          color: heroText.primary,
          px: { xs: 2.5, sm: 4, md: 8 },
          py: { xs: 3, sm: 4 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isStaff && (
          <Box
            sx={{
              position: "absolute",
              top: { xs: 12, md: 16 },
              right: { xs: 12, md: 20 },
              zIndex: 2,
            }}
          >
            {/* Una sola strada per gestire l'allenamento: l'admin (UX-23). La
                matita con il suo dialog di modifica, senza il Luogo, e' sparita. */}
            <StaffManageButton
              href={`/admin/allenamenti?apri=${session.id}`}
              label={t("manageRoster")}
            />
          </Box>
        )}

        {/* Il breadcrumb stava in `position: absolute` sopra il titolo: a 390px
            andava a capo e i due testi finivano uno sull'altro. Qui ha una riga
            sua, e resta su una riga sola con l'ellissi. */}
        <Box
          sx={{
            position: "relative",
            zIndex: 2,
            mb: { xs: 2, md: 2.5 },
            pr: isStaff ? { xs: 14, md: 15 } : 0,
            minWidth: 0,
          }}
        >
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{
              "& .MuiBreadcrumbs-separator": {
                color: heroText.muted,
                flexShrink: 0,
              },
              // Una riga sola: l'ultima voce si tronca, le altre restano
              // intere. Senza `flexShrink: 0` sul primo elemento le due voci si
              // restringono entrambe e i testi si sovrappongono a 320px.
              "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap" },
              "& .MuiBreadcrumbs-li": { minWidth: 0, overflow: "hidden" },
              "& .MuiBreadcrumbs-li:not(:last-of-type)": { flexShrink: 0 },
            }}
          >
            <MuiLink
              component={NextLink}
              href="/allenamenti"
              underline="hover"
              variant="body2"
              sx={{
                color: heroText.muted,
                whiteSpace: "nowrap",
                "&:hover": { color: heroText.primary },
              }}
            >
              {tNav("trainings")}
            </MuiLink>
            <Typography
              variant="body2"
              sx={{
                color: heroText.secondary,
                minWidth: 0,
              }}
              noWrap
            >
              {session.title}
            </Typography>
          </Breadcrumbs>
        </Box>

        <Box sx={{ maxWidth: "md", mx: "auto", position: "relative", textAlign: "center" }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              lineHeight: 1.15,
              fontSize: { xs: TYPE_SCALE.xl3, sm: TYPE_SCALE.xl4, md: TYPE_SCALE.xl5 },
              mb: 1.5,
            }}
          >
            {session.title}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              flexWrap: "wrap",
              mb: countdown ? 0.75 : 2,
            }}
          >
            {(() => {
              if (session.registrationOpen) return null;
              const sessEnd = sessionEndDate(sessionDate, sessionEnd);
              const isPast = new Date() >= sessEnd;
              const wasOpened = !!session.registrationOpenedAt;
              if (!wasOpened && !isPast) {
                return (
                  <StatusPill
                    onDark
                    variant="outlined"
                    icon={<ScheduleIcon aria-hidden />}
                    label={t("comingSoon")}
                  />
                );
              }
              return (
                <StatusPill
                  onDark
                  variant="muted"
                  icon={<LockIcon aria-hidden />}
                  label={t("registrationsClosed")}
                />
              );
            })()}
            <StatusPill onDark variant={status.variant} pulse={status.pulse} label={status.label} />
            {((session.allowedRoles && session.allowedRoles.length > 0) ||
              session.restrictTeamId) && (
              <Chip
                icon={<LockIcon sx={{ fontSize: "0.85rem !important" }} />}
                label={
                  session.restrictTeam ? (
                    <>
                      {t.rich("onlyTeam", {
                        team: session.restrictTeam.name,
                        name: (chunks) => (
                          <>
                            <TeamColorDot color={session.restrictTeam?.color} />
                            {chunks}
                          </>
                        ),
                      })}
                      {allowedRolesLabel ? ` · ${allowedRolesLabel}` : ""}
                    </>
                  ) : (
                    allowedRolesLabel
                  )
                }
                size="small"
                sx={{
                  bgcolor: "warning.light",
                  color: "warning.contrastText",
                  fontSize: TYPE_SCALE.xs,
                }}
              />
            )}
            {session.restrictTeamId && session.openRoles && session.openRoles.length > 0 && (
              <Chip
                icon={<LockOpenIcon sx={{ fontSize: "0.85rem !important" }} />}
                label={t("openToAllRoles", {
                  count: session.openRoles.length,
                  roles: formatRoleNumbers(session.openRoles, locale),
                })}
                size="small"
                sx={{
                  bgcolor: "success.light",
                  color: "success.contrastText",
                  fontSize: TYPE_SCALE.xs,
                }}
              />
            )}
          </Box>

          {countdown && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.75,
                mb: 2,
              }}
            >
              <AccessTimeIcon sx={{ fontSize: 14, color: heroText.muted }} />
              <Typography variant="body2" sx={{ color: heroText.secondary }}>
                {countdown}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: { xs: 1, sm: 2.5 },
              mb: 2.5,
              opacity: 0.82,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <CalendarTodayIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">
                {format(sessionDate, "EEEE d MMMM yyyy", { locale: dateLocale })}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <AccessTimeIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">
                {format(sessionDate, "HH:mm")}
                {sessionEnd && `–${format(sessionEnd, "HH:mm")}`}
              </Typography>
            </Box>
            {/* Dove (UX-15): il luogo dell'allenamento, o la sede del club.
                Link a Google Maps, non una mappa incorporata: niente cookie. */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <PlaceIcon sx={{ fontSize: 16 }} />
              <MuiLink
                href={mapsSearchUrl(trainingLocation(session.location))}
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                underline="always"
                variant="body2"
                aria-label={t("locationMap", { place: trainingLocation(session.location) })}
              >
                {trainingLocation(session.location)}
              </MuiLink>
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <ShareSection title={session.title} url={sessionUrl} dark />
          </Box>
        </Box>
      </Box>
    </>
  );
}
