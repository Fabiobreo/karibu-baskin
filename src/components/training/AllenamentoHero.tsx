"use client";
import { useTranslations, useLocale } from "next-intl";
import { Chip, Link as MuiLink } from "@mui/material";
import EntityHero, { HeroMeta } from "@/components/common/EntityHero";
import TeamColorDot from "@/components/teams/TeamColorDot";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceIcon from "@mui/icons-material/Place";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ScheduleIcon from "@mui/icons-material/Schedule";
import StatusPill from "@/components/common/StatusPill";
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

  // Stato delle iscrizioni quando sono chiuse: "a breve" se non si sono
  // ancora aperte e l'allenamento non e' passato, altrimenti "chiuse".
  const registrationPill = (() => {
    if (session.registrationOpen) return null;
    const isPast = new Date() >= sessionEndDate(sessionDate, sessionEnd);
    if (!session.registrationOpenedAt && !isPast) {
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
  })();

  return (
    <EntityHero
      breadcrumb={[{ label: tNav("trainings"), href: "/allenamenti" }, { label: session.title }]}
      title={session.title}
      manage={
        // Una sola strada per gestire l'allenamento: l'admin (UX-23).
        isStaff && (
          <StaffManageButton
            href={`/admin/allenamenti?apri=${session.id}`}
            label={t("manageRoster")}
          />
        )
      }
      badges={
        <>
          {registrationPill}
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
        </>
      }
      meta={
        <>
          <HeroMeta icon={<CalendarTodayIcon />}>
            {format(sessionDate, "EEEE d MMMM yyyy", { locale: dateLocale })}
          </HeroMeta>
          <HeroMeta icon={<AccessTimeIcon />}>
            {format(sessionDate, "HH:mm")}
            {sessionEnd && `–${format(sessionEnd, "HH:mm")}`}
            {countdown && ` · ${countdown}`}
          </HeroMeta>
          {/* Dove (UX-15): il luogo dell'allenamento, o la sede del club.
              Link a Google Maps, non una mappa incorporata: niente cookie. */}
          <HeroMeta icon={<PlaceIcon />}>
            <MuiLink
              href={mapsSearchUrl(trainingLocation(session.location))}
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              underline="always"
              aria-label={t("locationMap", { place: trainingLocation(session.location) })}
            >
              {trainingLocation(session.location)}
            </MuiLink>
          </HeroMeta>
        </>
      }
      actions={<ShareSection title={session.title} url={sessionUrl} dark />}
    />
  );
}
