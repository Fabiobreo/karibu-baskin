"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatRoleNumbers } from "@/lib/roleList";
import { TOUCH_TARGET_MIN } from "@/lib/touchTarget";
import { Box, Typography, Paper, Chip, Button, IconButton, Tooltip } from "@mui/material";
import TeamColorDot from "@/components/teams/TeamColorDot";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ScheduleIcon from "@mui/icons-material/Schedule";
import StatusPill from "@/components/common/StatusPill";
import { heroText } from "@/lib/heroStyles";
import Link from "next/link";
import { format } from "date-fns";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import TeamsModal from "@/components/training/TeamsModal";
import { TEAM_META } from "@/lib/constants";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface Athlete {
  id: string;
  name: string;
  role: number;
}
interface TeamsData {
  teamA: Athlete[];
  teamB: Athlete[];
  teamC?: Athlete[];
  coaches?: { id: string; name: string }[];
}

export interface SessionWithCount {
  id: string;
  title: string;
  date: string | Date;
  endTime: string | Date | null;
  dateSlug: string | null;
  teams: TeamsData | null;
  allowedRoles?: number[];
  restrictTeamId?: string | null;
  openRoles?: number[];
  restrictTeam?: { id: string; name: string; color: string | null } | null;
  registrationOpen?: boolean;
  registrationOpenedAt?: string | Date | null;
  _count: { registrations: number };
}

type StatusKey = "live" | "ended" | "todayBang" | "tomorrow" | "daysAway";

/**
 * Stati temporali neutri (UX-29): In corso e Oggi pastiglia invertita (In corso
 * con il pallino pulsante), Domani e "tra N giorni" contornate, Concluso tenue.
 * Niente verde: vuol dire "positivo", non "adesso".
 */
function getStatusData(
  date: Date,
  endTime: Date | null
): {
  key: StatusKey;
  diffDays?: number;
  variant: "inverted" | "outlined" | "muted";
  pulse?: boolean;
} {
  const now = new Date();
  const end = endTime ?? new Date(date.getTime() + 2 * 60 * 60 * 1000);
  if (now >= date && now <= end) return { key: "live", variant: "inverted", pulse: true };
  if (now > end) return { key: "ended", variant: "muted" };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((sessionDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { key: "todayBang", variant: "inverted" };
  if (diffDays === 1) return { key: "tomorrow", variant: "outlined" };
  return { key: "daysAway", diffDays, variant: "outlined" };
}

export default function SessionCard({
  session: s,
  hero = false,
  muted = false,
  live = false,
  isRegistered = false,
  myRegistrationId = null,
  isStaff = false,
  headingComponent = "h3",
}: {
  session: SessionWithCount;
  hero?: boolean;
  muted?: boolean;
  live?: boolean;
  isRegistered?: boolean;
  myRegistrationId?: string | null;
  isStaff?: boolean;
  /** Livello del titolo: h3 sotto una sezione (home), h2 dove la lista sta subito sotto l'h1. */
  headingComponent?: "h2" | "h3";
}) {
  const [teamsOpen, setTeamsOpen] = useState(false);
  const dateLocale = useActiveDateLocale();
  const locale = useLocale();
  const t = useTranslations("trainings");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");

  const date = new Date(s.date);
  const endTime = s.endTime ? new Date(s.endTime) : null;
  const href = `/allenamento/${s.dateSlug ?? s.id}`;
  const hasTeams = !!s.teams;
  const myTeam =
    myRegistrationId && s.teams
      ? (TEAM_META.find((tm) => s.teams![tm.key]?.some((a) => a.id === myRegistrationId)) ?? null)
      : null;
  const statusData = getStatusData(date, endTime);
  const statusLabel =
    statusData.key === "daysAway"
      ? tCommon("daysAway", { count: statusData.diffDays! })
      : statusData.key === "tomorrow"
        ? tCommon("tomorrow")
        : t(statusData.key);
  const now = new Date();
  const sessEnd = endTime ?? new Date(date.getTime() + 2 * 60 * 60 * 1000);
  const isPast = now > sessEnd;
  const isRegOpen = s.registrationOpen === true;
  const wasOpened = !!s.registrationOpenedAt;
  // Mostra "In arrivo" solo per sessioni FUTURE mai aperte. Le passate (e i futuri chiusi
  // manualmente) usano "Iscrizioni chiuse".
  const showInArrivo = !isRegOpen && !wasOpened && !isPast && !muted;
  const showChiuse = !isRegOpen && (wasOpened || isPast) && !muted;

  const px = 2;
  const iconSize = 13;
  const textVariant = "caption" as const;
  const dateFormat = "EEE d MMM";
  const chipFontSize = "0.68rem";

  return (
    <>
      <Paper
        elevation={muted ? 0 : live ? 4 : hero ? 4 : 2}
        variant={muted ? "outlined" : "elevation"}
        sx={{
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          opacity: muted ? 0.72 : 1,
          position: "relative",
          cursor: "pointer",
          "&:hover": { boxShadow: muted ? undefined : live ? 6 : hero ? 6 : 4 },
          ...(!muted &&
            !live && {
              border: (theme) => (theme.palette.mode === "dark" ? "1px solid" : undefined),
              borderColor: "divider",
            }),
          // In corso: contorno pieno nel colore del testo, niente bordo verde
          // pulsante (il movimento sta nel pallino della pastiglia).
          ...(live && {
            outline: "2px solid",
            outlineColor: "text.primary",
          }),
        }}
      >
        {/* Stretched link */}
        <Box
          component={Link}
          href={href}
          aria-label={s.title}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: "-2px",
            },
          }}
        />

        {/* Header */}
        <Box
          sx={{
            px,
            py: hero ? { xs: 2, sm: 2.5 } : 1.5,
            background: (theme) =>
              muted
                ? theme.palette.action.hover
                : theme.palette.mode === "dark"
                  ? theme.palette.common.black
                  : theme.palette.heroGradient.dark,
            display: "flex",
            alignItems: hero ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: 1,
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
            <Typography
              variant={hero ? "h4" : "subtitle1"}
              component={headingComponent}
              fontWeight={hero ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold}
              noWrap={!hero}
              sx={{
                color: muted ? "text.primary" : heroText.primary,
                lineHeight: 1.2,
                ...(hero && { fontSize: { xs: TYPE_SCALE.xl, sm: TYPE_SCALE.xl2 } }),
              }}
            >
              {s.title}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexShrink: 0,
              mt: hero ? 0.25 : 0,
            }}
          >
            {/* L'intestazione e' scura, tranne nelle card spente. */}
            {showInArrivo && (
              <StatusPill
                onDark
                variant="outlined"
                icon={<ScheduleIcon aria-hidden />}
                label={t("comingSoon")}
              />
            )}
            {showChiuse && (
              <StatusPill
                onDark
                variant="muted"
                icon={<LockIcon aria-hidden />}
                label={t("registrationsClosed")}
              />
            )}
            <StatusPill
              onDark={!muted}
              variant={muted ? "muted" : statusData.variant}
              pulse={!muted && statusData.pulse}
              label={statusLabel}
            />
            {/* Lo staff gestisce l'allenamento dall'admin (UX-14): qui solo un
                collegamento, niente piu' modifica, iscrizioni e squadre. */}
            {isStaff && (
              <Tooltip title="Gestisci in admin">
                <IconButton
                  href={`/admin/allenamenti?apri=${s.id}`}
                  aria-label={`Gestisci ${s.title} in admin`}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    ...TOUCH_TARGET_MIN,
                    // E' un bottone: serve almeno 3:1 anche da spento.
                    color: muted ? "text.secondary" : heroText.secondary,
                    pointerEvents: "auto",
                  }}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Body: colonna info+CTA | colonna stamp */}
        <Box sx={{ flex: 1, display: "flex" }}>
          {/* Colonna sinistra: info in cima, CTA in fondo */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              pl: px,
              pr: px,
              pt: 1.5,
              pb: 2,
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
              pointerEvents: "none",
            }}
          >
            <Box
              sx={{ display: "flex", alignItems: "center", gap: hero ? 2 : 1.5, flexWrap: "wrap" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <CalendarTodayIcon sx={{ fontSize: iconSize, color: "text.secondary" }} />
                <Typography
                  variant={textVariant}
                  color="text.secondary"
                  fontWeight={FONT_WEIGHT.regular}
                >
                  {format(date, dateFormat, { locale: dateLocale })}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <AccessTimeIcon sx={{ fontSize: iconSize, color: "text.secondary" }} />
                <Typography
                  variant={textVariant}
                  color="text.secondary"
                  fontWeight={FONT_WEIGHT.regular}
                >
                  {format(date, "HH:mm")}
                  {endTime && `–${format(endTime, "HH:mm")}`}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <GroupsIcon sx={{ fontSize: iconSize, color: "text.secondary" }} />
                <Typography
                  variant={textVariant}
                  color="text.secondary"
                  fontWeight={FONT_WEIGHT.regular}
                >
                  {t("registeredCount", { count: s._count.registrations })}
                </Typography>
              </Box>
              {isRegistered && !myTeam && (
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: "0.85rem !important" }} />}
                  label={t("registeredBadge")}
                  size="small"
                  color="success"
                  sx={{ fontSize: chipFontSize }}
                />
              )}
            </Box>

            {(s.restrictTeamId || (s.allowedRoles && s.allowedRoles.length > 0)) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  icon={<LockIcon sx={{ fontSize: "0.9rem !important" }} />}
                  label={
                    s.restrictTeam ? (
                      <>
                        {t.rich("onlyTeam", {
                          team: s.restrictTeam.name,
                          name: (chunks) => (
                            <>
                              <TeamColorDot color={s.restrictTeam?.color} />
                              {chunks}
                            </>
                          ),
                        })}
                        {s.allowedRoles?.length
                          ? ` · ${s.allowedRoles.map((r) => tRoles("role", { n: r })).join(", ")}`
                          : ""}
                      </>
                    ) : (
                      s.allowedRoles!.map((r) => tRoles("role", { n: r })).join(", ")
                    )
                  }
                  size="small"
                  sx={{
                    fontSize: chipFontSize,
                    bgcolor: "warning.light",
                    color: "warning.contrastText",
                  }}
                />
                {s.restrictTeamId && s.openRoles && s.openRoles.length > 0 && (
                  <Chip
                    icon={<LockOpenIcon sx={{ fontSize: "0.9rem !important" }} />}
                    label={t("openToAllRoles", {
                      // `count` è obbligatorio: la stringa è al plurale ICU e
                      // senza di esso next-intl rende un errore di formattazione
                      // al posto dell'etichetta. `formatRoleNumbers` allinea la
                      // resa a quella dell'hero, che localizza la congiunzione.
                      count: s.openRoles.length,
                      roles: formatRoleNumbers(s.openRoles, locale),
                    })}
                    size="small"
                    sx={{
                      fontSize: chipFontSize,
                      bgcolor: "success.light",
                      color: "success.contrastText",
                    }}
                  />
                )}
              </Box>
            )}

            {/* CTA in fondo alla colonna sinistra */}
            <Box
              sx={{
                mt: "auto",
                pt: 0.75,
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                pointerEvents: "auto",
                zIndex: 2,
              }}
            >
              {!isRegistered && !muted && isRegOpen && (
                // 40 px e senza freccia (UX-30): e' l'azione principale della card.
                <Button href={href} variant="contained">
                  {t("signUp")}
                </Button>
              )}
              {hasTeams && (
                <Button
                  // Un solo bottone pieno per card: se c'e' "Iscriviti", le
                  // squadre passano in secondo piano (UX-30).
                  variant={
                    myTeam || (!isRegistered && !muted && isRegOpen) ? "outlined" : "contained"
                  }
                  startIcon={<SportsBasketballIcon />}
                  onClick={() => setTeamsOpen(true)}
                >
                  {t("viewTeamsBtn")}
                </Button>
              )}
            </Box>
          </Box>

          {/* Colonna stamp */}
          {myTeam && !muted && (
            <Box
              sx={{
                alignSelf: "stretch",
                maxHeight: 120,
                maxWidth: 110,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pr: 2,
                pointerEvents: "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/stamps/${myTeam.name.toLowerCase()}.png`}
                alt={`Squadra ${myTeam.name}`}
                style={{ height: "100%", width: "auto", display: "block", opacity: 0.5 }}
              />
            </Box>
          )}
        </Box>
      </Paper>

      {hasTeams && (
        <TeamsModal
          open={teamsOpen}
          onClose={() => setTeamsOpen(false)}
          sessionTitle={s.title}
          sessionDate={s.date}
          sessionEndTime={s.endTime}
          teamA={s.teams!.teamA}
          teamB={s.teams!.teamB}
          teamC={s.teams!.teamC}
          coaches={s.teams!.coaches}
        />
      )}
    </>
  );
}
