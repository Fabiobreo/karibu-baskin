"use client";
import { useState, useEffect } from "react";
import {
  Box, Typography, Chip, Button, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Divider, CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EditIcon from "@mui/icons-material/Edit";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import ShareSection from "@/components/ShareSection";
import SessionRestrictionEditor, {
  seasonForDate,
  type RestrictionValue,
} from "@/components/SessionRestrictionEditor";
import { toLocalDateString, toLocalTimeString, sessionEndDate } from "@/lib/dateUtils";

const DEFAULT_RESTRICTIONS: RestrictionValue = { allowedRoles: [], restrictTeamId: null, openRoles: [] };

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
}

interface StatusBadge {
  label: string;
  bgcolor: string;
}

function getSessionStatus(date: Date, endTime: Date | null): StatusBadge {
  const now = new Date();
  const end = sessionEndDate(date, endTime);

  if (now >= date && now <= end) return { label: "In corso", bgcolor: "#2E7D32" };
  if (now > end) return { label: "Terminato", bgcolor: "rgba(255,255,255,0.18)" };

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((sessionDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: "Oggi!", bgcolor: "#E65100" };
  if (diffDays === 1) return { label: "Domani", bgcolor: "#1565C0" };
  return { label: `Tra ${diffDays} giorni`, bgcolor: "#1565C0" };
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
  const status = getSessionStatus(sessionDate, sessionEnd);

  const [sessionUrl, setSessionUrl] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSessionUrl(window.location.href); }, []);

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
    if (!editTitle.trim()) { setEditError("Il titolo è obbligatorio"); return; }
    if (!editDate) { setEditError("La data è obbligatoria"); return; }
    if (editEndTime && editEndTime <= editTime) { setEditError("L'orario di fine deve essere dopo l'inizio"); return; }
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
        const data = await res.json();
        setEditError(data.error ?? "Errore nel salvataggio");
        return;
      }
      setEditOpen(false);
      onSessionSaved(dateSlug);
    } catch {
      setEditError("Errore di rete, riprova");
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <>
      <Box
        sx={{
          background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
          color: "#fff",
          px: { xs: 2.5, sm: 4, md: 8 },
          py: { xs: 3, sm: 4 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.1)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -80, left: -80, width: 320, height: 320, borderRadius: "50%", backgroundColor: "rgba(230,81,0,0.06)", pointerEvents: "none" }} />

        <Box sx={{ maxWidth: "md", mx: "auto", position: "relative" }}>
          <Box sx={{ mb: 2 }}>
            <Button
              href="/allenamenti"
              startIcon={<ArrowBackIcon sx={{ fontSize: "0.95rem !important" }} />}
              size="small"
              sx={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "0.78rem",
                fontWeight: 500,
                px: 0,
                minWidth: 0,
                "&:hover": { color: "#fff", backgroundColor: "transparent" },
              }}
            >
              Allenamenti
            </Button>
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1.5 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 800,
                lineHeight: 1.15,
                fontSize: { xs: "1.7rem", sm: "2.2rem", md: "2.6rem" },
                flex: 1,
              }}
            >
              {session.title}
            </Typography>
            {isStaff && (
              <Tooltip title="Modifica allenamento">
                <IconButton
                  onClick={openEdit}
                  size="small"
                  sx={{
                    color: "rgba(255,255,255,0.55)",
                    mt: 0.5,
                    flexShrink: 0,
                    "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  <EditIcon sx={{ fontSize: "1.1rem" }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: countdown ? 0.75 : 2 }}>
            <Chip
              label={status.label}
              size="small"
              sx={{ bgcolor: status.bgcolor, color: "#fff", fontWeight: 700, fontSize: "0.72rem", letterSpacing: 0.5 }}
            />
            {(session.allowedRoles && session.allowedRoles.length > 0 || session.restrictTeamId) && (
              <Chip
                icon={<LockIcon sx={{ fontSize: "0.85rem !important" }} />}
                label={session.restrictTeam
                  ? `Solo ${session.restrictTeam.name}${session.allowedRoles?.length ? ` · ${session.allowedRoles.map((r) => `Ruolo ${r}`).join(", ")}` : ""}`
                  : session.allowedRoles!.map((r) => `Ruolo ${r}`).join(", ")}
                size="small"
                sx={{ bgcolor: "warning.light", color: "warning.contrastText", fontWeight: 600, fontSize: "0.7rem" }}
              />
            )}
            {session.restrictTeamId && session.openRoles && session.openRoles.length > 0 && (
              <Chip
                icon={<LockOpenIcon sx={{ fontSize: "0.85rem !important" }} />}
                label={`Aperto a tutti i ${session.openRoles.map((r) => `${r}`).join(", ")}`}
                size="small"
                sx={{ bgcolor: "success.light", color: "success.contrastText", fontWeight: 600, fontSize: "0.7rem" }}
              />
            )}
          </Box>

          {countdown && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2 }}>
              <AccessTimeIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }} />
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                {countdown}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 1, sm: 2.5 }, mb: 2.5, opacity: 0.82 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <CalendarTodayIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {format(sessionDate, "EEEE d MMMM yyyy", { locale: it })}
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

          <ShareSection sessionTitle={session.title} sessionUrl={sessionUrl} dark />
        </Box>
      </Box>

      {/* Dialog: modifica allenamento */}
      <Dialog open={editOpen} onClose={() => !editLoading && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Modifica allenamento</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <TextField
              label="Titolo"
              value={editTitle}
              onChange={(e) => { setEditTitle(e.target.value); setEditError(""); }}
              fullWidth size="small"
              disabled={editLoading}
              autoFocus
            />
            <TextField
              label="Data"
              type="date"
              value={editDate}
              onChange={(e) => { setEditDate(e.target.value); setEditError(""); }}
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
                onChange={(e) => { setEditTime(e.target.value); setEditError(""); }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={editLoading}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Fine"
                type="time"
                value={editEndTime}
                onChange={(e) => { setEditEndTime(e.target.value); setEditError(""); }}
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
            startIcon={editLoading ? <CircularProgress size={16} color="inherit" /> : <EventAvailableIcon />}
            sx={{ px: 3 }}
          >
            {editLoading ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
