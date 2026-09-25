"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatRoleNumbers } from "@/lib/roleList";
import { TOUCH_TARGET_MIN } from "@/lib/touchTarget";
import { Box, Typography, Paper, Chip, Button, IconButton, Tooltip } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import Link from "next/link";
import { format } from "date-fns";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import TeamsModal from "@/components/training/TeamsModal";
import { TEAM_META } from "@/lib/constants";

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

function getStatusData(
  date: Date,
  endTime: Date | null
): { key: StatusKey; diffDays?: number; color: string; labelColor: string } {
  const now = new Date();
  const end = endTime ?? new Date(date.getTime() + 2 * 60 * 60 * 1000);
  if (now >= date && now <= end)
    return { key: "live", color: "match.win", labelColor: "common.white" };
  // Grigio fisso, non `text.*`: e' lo sfondo di un'etichetta bianca, e in tema
  // scuro `text.secondary` (#AAAAAA) la porterebbe a 2,3:1.
  if (now > end) return { key: "ended", color: "grey.700", labelColor: "common.white" };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((sessionDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0)
    return { key: "todayBang", color: "primary.fill", labelColor: "common.white" };
  // Come nell'hero: niente ciano fuori palette per "Domani" / "Tra N giorni".
  if (diffDays === 1)
    return { key: "tomorrow", color: "secondary.main", labelColor: "secondary.contrastText" };
  return {
    key: "daysAway",
    diffDays,
    color: "secondary.main",
    labelColor: "secondary.contrastText",
  };
}

export default function SessionCard({
  session: s,
  hero = false,
  muted = false,
  live = false,
  isRegistered = false,
  myRegistrationId = null,
  isStaff = false,
}: {
  session: SessionWithCount;
  hero?: boolean;
  muted?: boolean;
  live?: boolean;
  isRegistered?: boolean;
  myRegistrationId?: string | null;
  isStaff?: boolean;
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
  const status = { label: statusLabel, color: statusData.color, labelColor: statusData.labelColor };
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
          ...(live && {
            outline: (theme) => `2px solid ${theme.palette.status.live}`,
            "@keyframes pulse-border": {
              "0%": { boxShadow: "0 0 0 0 rgba(46,125,50,0.6), 0 2px 8px rgba(0,0,0,0.15)" },
              "50%": { boxShadow: "0 0 0 10px rgba(46,125,50,0), 0 2px 8px rgba(0,0,0,0.15)" },
              "100%": { boxShadow: "0 0 0 0 rgba(46,125,50,0.6), 0 2px 8px rgba(0,0,0,0.15)" },
            },
            animation: "pulse-border 2s ease-out infinite",
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
              component="h3"
              fontWeight={hero ? 800 : 700}
              noWrap={!hero}
              sx={{
                color: muted ? "text.primary" : "common.white",
                lineHeight: 1.2,
                ...(hero && { fontSize: { xs: "1.3rem", sm: "1.5rem" } }),
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
            {showInArrivo && (
              <Chip
                icon={
                  <HourglassEmptyIcon
                    sx={{ fontSize: "0.9rem !important", color: "common.white" }}
                  />
                }
                label={t("comingSoon")}
                size="small"
                sx={{
                  bgcolor: "status.pending",
                  color: "common.white",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              />
            )}
            {showChiuse && (
              <Chip
                icon={<LockIcon sx={{ fontSize: "0.85rem !important", color: "common.white" }} />}
                label={t("registrationsClosed")}
                size="small"
                sx={{
                  bgcolor: "status.closed",
                  color: "common.white",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              />
            )}
            <Chip
              label={status.label}
              size="small"
              sx={{
                bgcolor: muted ? "action.selected" : status.color,
                color: muted ? "text.secondary" : status.labelColor,
                fontWeight: 700,
                fontSize: "0.75rem",
              }}
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
                    color: muted ? "text.secondary" : "rgba(255,255,255,0.7)",
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
                <Typography variant={textVariant} color="text.secondary" fontWeight={500}>
                  {format(date, dateFormat, { locale: dateLocale })}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <AccessTimeIcon sx={{ fontSize: iconSize, color: "text.secondary" }} />
                <Typography variant={textVariant} color="text.secondary" fontWeight={500}>
                  {format(date, "HH:mm")}
                  {endTime && `–${format(endTime, "HH:mm")}`}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <GroupsIcon sx={{ fontSize: iconSize, color: "text.secondary" }} />
                <Typography variant={textVariant} color="text.secondary" fontWeight={500}>
                  {t("registeredCount", { count: s._count.registrations })}
                </Typography>
              </Box>
              {isRegistered && !myTeam && (
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: "0.85rem !important" }} />}
                  label={t("registeredBadge")}
                  size="small"
                  color="success"
                  sx={{ fontWeight: 600, fontSize: chipFontSize }}
                />
              )}
            </Box>

            {(s.restrictTeamId || (s.allowedRoles && s.allowedRoles.length > 0)) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  icon={<LockIcon sx={{ fontSize: "0.9rem !important" }} />}
                  label={
                    s.restrictTeam
                      ? `${t("onlyTeam", { team: s.restrictTeam.name })}${s.allowedRoles?.length ? ` · ${s.allowedRoles.map((r) => tRoles("role", { n: r })).join(", ")}` : ""}`
                      : s.allowedRoles!.map((r) => tRoles("role", { n: r })).join(", ")
                  }
                  size="small"
                  sx={{
                    fontSize: chipFontSize,
                    fontWeight: 700,
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
                      fontWeight: 700,
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
                <Button
                  component={Link}
                  href={href}
                  variant="contained"
                  size="small"
                  sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.4 }}
                >
                  {t("signUp")}
                </Button>
              )}
              {hasTeams && (
                <Button
                  variant={myTeam ? "outlined" : "contained"}
                  size="small"
                  startIcon={<SportsBasketballIcon sx={{ fontSize: "0.85rem !important" }} />}
                  onClick={() => setTeamsOpen(true)}
                  sx={{ fontWeight: 600, fontSize: "0.75rem", py: 0.4 }}
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
