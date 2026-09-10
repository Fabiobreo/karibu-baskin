"use client";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider,
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EditIcon from "@mui/icons-material/Edit";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import NextLink from "next/link";
import { format } from "date-fns";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import ShareSection from "@/components/common/ShareSection";
import SessionRestrictionEditor, {
  seasonForDate,
  type RestrictionValue,
} from "@/components/training/SessionRestrictionEditor";
import { toLocalDateString, toLocalTimeString, sessionEndDate } from "@/lib/dateUtils";
import { readError } from "@/lib/fetchJson";
import { formatRoleNumbers } from "@/lib/roleList";
import { SITE_URL } from "@/lib/siteUrl";

const DEFAULT_RESTRICTIONS: RestrictionValue = {
  allowedRoles: [],
  restrictTeamId: null,
  openRoles: [],
};

interface Session {
  id: string;
  title: string;
  date: string;
  endTime: string | null;
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
  bgcolor: string;
  /** Colore dell'etichetta: la pastiglia non e' sempre scura. */
  color: string;
}

function getSessionStatus(
  date: Date,
  endTime: Date | null,
  t: ReturnType<typeof useTranslations>,
  tCommon: ReturnType<typeof useTranslations>
): StatusBadge {
  const now = new Date();
  const end = sessionEndDate(date, endTime);

  if (now >= date && now <= end)
    return { label: t("live"), bgcolor: "match.win", color: "common.white" };
  if (now > end) return { label: t("ended"), bgcolor: "action.selected", color: "text.secondary" };

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((sessionDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0)
    // Etichetta bianca: `primary.dark` (5,60:1), non `main` (3,79:1).
    return { label: t("todayBang"), bgcolor: "primary.dark", color: "common.white" };
  // "Domani" e "Tra N giorni" stavano sul ciano di default di MUI, fuori dalla
  // palette arancione/nera: passano al nero del tema, che resta distinto sia
  // dall'arancione di "Oggi" sia dal grigio di "Concluso".
  if (diffDays === 1)
    return {
      label: tCommon("tomorrow"),
      bgcolor: "secondary.main",
      color: "secondary.contrastText",
    };
  return {
    label: tCommon("daysAway", { count: diffDays }),
    bgcolor: "secondary.main",
    color: "secondary.contrastText",
  };
}

interface Props {
  session: Session;
  sessionDate: Date;
  sessionEnd: Date | null;
  isStaff: boolean;
  countdown: string | null;
  onSessionSaved: (newDateSlug: string) => void;
}

export default function AllenamientoHero({
  session,
  sessionDate,
  sessionEnd,
  isStaff,
  countdown,
  onSessionSaved,
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

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editRestrictions, setEditRestrictions] = useState<RestrictionValue>(DEFAULT_RESTRICTIONS);
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  function openEdit() {
    const date = new Date(session.date);
    const end = session.endTime ? new Date(session.endTime) : null;
    setEditTitle(session.title);
    setEditDate(toLocalDateString(date));
    setEditTime(toLocalTimeString(date));
    setEditEndTime(end ? toLocalTimeString(end) : "");
    setEditRestrictions({
      allowedRoles: session.allowedRoles ?? [],
      restrictTeamId: session.restrictTeamId ?? null,
      openRoles: session.openRoles ?? [],
    });
    setEditError("");
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) {
      setEditError(t("titleRequired"));
      return;
    }
    if (!editDate) {
      setEditError(t("dateRequired"));
      return;
    }
    if (editEndTime && editEndTime <= editTime) {
      setEditError(t("endAfterStart"));
      return;
    }
    setEditLoading(true);
    setEditError("");
    try {
      const dateTime = new Date(`${editDate}T${editTime}:00`);
      const endDateTime = editEndTime ? new Date(`${editDate}T${editEndTime}:00`) : null;
      const dateSlug = `${editDate}${editTime}`.replace(/-/g, "").replace(":", "");
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          date: dateTime.toISOString(),
          endTime: endDateTime?.toISOString() ?? null,
          dateSlug,
          allowedRoles: editRestrictions.allowedRoles,
          restrictTeamId: editRestrictions.restrictTeamId,
          openRoles: editRestrictions.openRoles,
        }),
      });
      if (!res.ok) {
        setEditError(await readError(res));
        return;
      }
      setEditOpen(false);
      onSessionSaved(dateSlug);
    } catch {
      setEditError(tCommon("networkError"));
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <>
      <Box
        style={{
          backgroundImage: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
        }}
        sx={{
          color: "common.white",
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
            <Tooltip title="Modifica allenamento">
              <IconButton
                onClick={openEdit}
                size="small"
                aria-label="Modifica allenamento"
                sx={{
                  color: "common.white",
                  bgcolor: (theme) => alpha(theme.palette.common.white, 0.1),
                  border: "1px solid",
                  borderColor: (theme) => alpha(theme.palette.common.white, 0.2),
                  "&:hover": { bgcolor: (theme) => alpha(theme.palette.common.white, 0.2) },
                }}
              >
                <EditIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 260,
            height: 260,
            borderRadius: "50%",
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.06),
            pointerEvents: "none",
          }}
        />

        {/* Il breadcrumb stava in `position: absolute` sopra il titolo: a 390px
            andava a capo e i due testi finivano uno sull'altro. Qui ha una riga
            sua, e resta su una riga sola con l'ellissi. */}
        <Box
          sx={{
            position: "relative",
            zIndex: 2,
            mb: { xs: 2, md: 2.5 },
            pr: isStaff ? { xs: 5, md: 6 } : 0,
            minWidth: 0,
          }}
        >
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{
              "& .MuiBreadcrumbs-separator": {
                color: (theme) => alpha(theme.palette.common.white, 0.4),
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
                color: (theme) => alpha(theme.palette.common.white, 0.6),
                fontWeight: 500,
                whiteSpace: "nowrap",
                "&:hover": { color: "common.white" },
              }}
            >
              {tNav("trainings")}
            </MuiLink>
            <Typography
              variant="body2"
              sx={{
                color: (theme) => alpha(theme.palette.common.white, 0.9),
                fontWeight: 500,
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
              fontWeight: 800,
              lineHeight: 1.15,
              fontSize: { xs: "1.7rem", sm: "2.2rem", md: "2.6rem" },
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
                  <Chip
                    icon={
                      <HourglassEmptyIcon
                        sx={{ fontSize: "0.85rem !important", color: "common.white" }}
                      />
                    }
                    label={t("comingSoon")}
                    size="small"
                    sx={{
                      bgcolor: "status.pending",
                      color: "common.white",
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      letterSpacing: 0.5,
                    }}
                  />
                );
              }
              return (
                <Chip
                  icon={<LockIcon sx={{ fontSize: "0.85rem !important", color: "common.white" }} />}
                  label={t("registrationsClosed")}
                  size="small"
                  sx={{
                    bgcolor: "status.closed",
                    color: "common.white",
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    letterSpacing: 0.5,
                  }}
                />
              );
            })()}
            <Chip
              label={status.label}
              size="small"
              sx={{
                bgcolor: status.bgcolor,
                color: status.color,
                fontWeight: 700,
                fontSize: "0.72rem",
                letterSpacing: 0.5,
              }}
            />
            {((session.allowedRoles && session.allowedRoles.length > 0) ||
              session.restrictTeamId) && (
              <Chip
                icon={<LockIcon sx={{ fontSize: "0.85rem !important" }} />}
                label={
                  session.restrictTeam
                    ? `${t("onlyTeam", { team: session.restrictTeam.name })}${allowedRolesLabel ? ` · ${allowedRolesLabel}` : ""}`
                    : allowedRolesLabel
                }
                size="small"
                sx={{
                  bgcolor: "warning.light",
                  color: "warning.contrastText",
                  fontWeight: 600,
                  fontSize: "0.7rem",
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
                  fontWeight: 600,
                  fontSize: "0.7rem",
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
              <AccessTimeIcon
                sx={{ fontSize: 14, color: (theme) => alpha(theme.palette.common.white, 0.55) }}
              />
              <Typography
                variant="body2"
                sx={{ color: (theme) => alpha(theme.palette.common.white, 0.75), fontWeight: 500 }}
              >
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
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {format(sessionDate, "EEEE d MMMM yyyy", { locale: dateLocale })}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <AccessTimeIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {format(sessionDate, "HH:mm")}
                {sessionEnd && `–${format(sessionEnd, "HH:mm")}`}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <ShareSection sessionTitle={session.title} sessionUrl={sessionUrl} dark />
          </Box>
        </Box>
      </Box>

      {/* Dialog: modifica allenamento */}
      <Dialog
        open={editOpen}
        onClose={() => !editLoading && setEditOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight={700}>Modifica allenamento</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <TextField
              label="Titolo"
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                setEditError("");
              }}
              fullWidth
              size="small"
              disabled={editLoading}
              autoFocus
            />
            <TextField
              label="Data"
              type="date"
              value={editDate}
              onChange={(e) => {
                setEditDate(e.target.value);
                setEditError("");
              }}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              disabled={editLoading}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Inizio"
                type="time"
                value={editTime}
                onChange={(e) => {
                  setEditTime(e.target.value);
                  setEditError("");
                }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={editLoading}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Fine"
                type="time"
                value={editEndTime}
                onChange={(e) => {
                  setEditEndTime(e.target.value);
                  setEditError("");
                }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={editLoading}
                sx={{ flex: 1 }}
              />
            </Box>
            <Divider />
            <SessionRestrictionEditor
              value={editRestrictions}
              onChange={setEditRestrictions}
              disabled={editLoading}
              seasonFilter={editDate ? seasonForDate(new Date(editDate)) : undefined}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} disabled={editLoading} color="inherit">
            Annulla
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={editLoading}
            startIcon={
              editLoading ? <CircularProgress size={16} color="inherit" /> : <EventAvailableIcon />
            }
            sx={{ px: 3 }}
          >
            {editLoading ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
