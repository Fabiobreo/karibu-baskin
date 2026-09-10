"use client";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import AddIcon from "@mui/icons-material/Add";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import { format } from "date-fns";
import { useToast } from "@/context/ToastContext";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import SessionRestrictionEditor, {
  seasonForDate,
  type RestrictionValue,
} from "@/components/training/SessionRestrictionEditor";
import { readError } from "@/lib/fetchJson";

// Dialog riservato allo staff → testi in italiano per scelta (come l'admin)

type CreateType = "training" | "event" | "match";

interface CompetitiveTeam {
  id: string;
  name: string;
  season: string;
  color?: string | null;
}
interface OpposingTeam {
  id: string;
  name: string;
  city?: string | null;
}

/** Dialog staff per creare allenamento, evento generico o partita dal calendario. */
export default function CreateEventDialog({
  day,
  isAdmin,
  onClose,
  onCreated,
}: {
  day: Date | null;
  isAdmin: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const dateLocale = useActiveDateLocale();
  const [tab, setTab] = useState<CreateType>("training");
  const [loading, setLoading] = useState(false);

  // Training fields
  const [trainTitle, setTrainTitle] = useState("Allenamento settimanale");
  const [trainStart, setTrainStart] = useState("18:00");
  const [trainEnd, setTrainEnd] = useState("20:00");
  const [trainRestrictions, setTrainRestrictions] = useState<RestrictionValue>({
    allowedRoles: [],
    restrictTeamId: null,
    openRoles: [],
  });

  // Event fields
  const [eventTitle, setEventTitle] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");

  // Match fields
  const [matchTeamId, setMatchTeamId] = useState("");
  const [matchOpponentId, setMatchOpponentId] = useState("");
  const [matchTime, setMatchTime] = useState("15:30");
  const [matchIsHome, setMatchIsHome] = useState<"home" | "away">("home");
  const [matchVenue, setMatchVenue] = useState("");
  const [teams, setTeams] = useState<CompetitiveTeam[]>([]);
  const [opponents, setOpponents] = useState<OpposingTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dateStr = day ? format(day, "yyyy-MM-dd") : "";
  const dateLabelFull = day ? format(day, "EEEE d MMMM yyyy", { locale: dateLocale }) : "";

  // Load teams/opponents when match tab is selected
  useEffect(() => {
    if (tab === "match" && isAdmin && teams.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTeamsLoading(true);
      Promise.all([
        fetch("/api/competitive-teams").then((r) => r.json()),
        fetch("/api/opposing-teams").then((r) => r.json()),
      ])
        .then(([t, o]: [CompetitiveTeam[], OpposingTeam[]]) => {
          setTeams(t);
          setOpponents(o);
          const season = seasonForDate(dateStr);
          const seasonTeams = t.filter((team) => team.season === season);
          const firstTeam = seasonTeams[0] ?? t[0];
          if (firstTeam) setMatchTeamId(firstTeam.id);
        })
        .catch(() => showToast({ message: "Errore nel caricamento squadre", severity: "error" }))
        .finally(() => setTeamsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function resetForm() {
    setTrainTitle("Allenamento settimanale");
    setTrainStart("18:00");
    setTrainEnd("20:00");
    setTrainRestrictions({ allowedRoles: [], restrictTeamId: null, openRoles: [] });
    setEventTitle("");
    setEventLocation("");
    setEventEndDate("");
    setMatchTeamId("");
    setMatchOpponentId("");
    setMatchTime("15:30");
    setMatchIsHome("home");
    setMatchVenue("");
    setErrors({});
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (tab === "training") {
      if (!trainTitle.trim()) errs.trainTitle = "Il titolo è obbligatorio";
      if (!trainStart) errs.trainStart = "Orario obbligatorio";
      if (trainEnd && trainEnd <= trainStart) errs.trainEnd = "Fine deve essere dopo l'inizio";
    } else if (tab === "event") {
      if (!eventTitle.trim()) errs.eventTitle = "Il titolo è obbligatorio";
    } else if (tab === "match") {
      if (!matchTeamId) errs.matchTeamId = "Seleziona una squadra";
      if (!matchOpponentId) errs.matchOpponentId = "Seleziona un avversario";
      if (!matchTime) errs.matchTime = "Orario obbligatorio";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!day || !validate()) return;
    setLoading(true);
    try {
      let res: Response;
      if (tab === "training") {
        const dateTime = new Date(`${dateStr}T${trainStart}:00`);
        const endDateTime = trainEnd ? new Date(`${dateStr}T${trainEnd}:00`) : null;
        res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trainTitle.trim(),
            date: dateTime.toISOString(),
            endTime: endDateTime?.toISOString() ?? null,
            dateSlug: `${dateStr}${trainStart}`.replace(/-/g, "").replace(":", ""),
            allowedRoles: trainRestrictions.allowedRoles,
            restrictTeamId: trainRestrictions.restrictTeamId,
            openRoles: trainRestrictions.openRoles,
          }),
        });
      } else if (tab === "event") {
        res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: eventTitle.trim(),
            date: new Date(`${dateStr}T00:00:00`).toISOString(),
            endDate: eventEndDate ? new Date(`${eventEndDate}T00:00:00`).toISOString() : null,
            location: eventLocation.trim() || null,
          }),
        });
      } else {
        res = await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId: matchTeamId,
            opponentId: matchOpponentId,
            date: new Date(`${dateStr}T${matchTime}:00`).toISOString(),
            isHome: matchIsHome === "home",
            venue: matchVenue.trim() || null,
          }),
        });
      }

      if (!res.ok) {
        const message = await readError(res);
        showToast({ message: message, severity: "error" });
        return;
      }

      const typeLabel = tab === "training" ? "Allenamento" : tab === "event" ? "Evento" : "Partita";
      showToast({ message: `${typeLabel} creato con successo`, severity: "success" });
      resetForm();
      onCreated();
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (!day) return null;

  return (
    <Dialog open onClose={handleClose} maxWidth="xs" fullWidth>
      {/* Banner */}
      <Box
        sx={{
          bgcolor: "primary.main",
          px: 3,
          pt: 2.5,
          pb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: (theme) => alpha(theme.palette.common.white, 0.2),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AddIcon sx={{ color: "common.white", fontSize: "1.2rem" }} />
        </Box>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: (theme) => alpha(theme.palette.common.white, 0.8),
              fontWeight: 600,
              textTransform: "capitalize",
            }}
          >
            {dateLabelFull}
          </Typography>
          <Typography variant="h6" fontWeight={800} sx={{ color: "common.white", lineHeight: 1.2 }}>
            Nuovo evento
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v as CreateType);
            setErrors({});
          }}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            value="training"
            label="Allenamento"
            icon={<SportsBasketballIcon sx={{ fontSize: "1rem" }} />}
            iconPosition="start"
            sx={{ fontSize: "0.78rem", minHeight: 48 }}
          />
          <Tab
            value="event"
            label="Evento"
            icon={<EventNoteIcon sx={{ fontSize: "1rem" }} />}
            iconPosition="start"
            sx={{ fontSize: "0.78rem", minHeight: 48 }}
          />
          {isAdmin && (
            <Tab
              value="match"
              label="Partita"
              icon={<EmojiEventsIcon sx={{ fontSize: "1rem" }} />}
              iconPosition="start"
              sx={{ fontSize: "0.78rem", minHeight: 48 }}
            />
          )}
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 2.5, pb: 1 }}>
        {/* Training form */}
        {tab === "training" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Titolo"
              value={trainTitle}
              onChange={(e) => {
                setTrainTitle(e.target.value);
                setErrors((p) => ({ ...p, trainTitle: "" }));
              }}
              fullWidth
              size="small"
              error={!!errors.trainTitle}
              helperText={errors.trainTitle}
              disabled={loading}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Inizio"
                type="time"
                value={trainStart}
                onChange={(e) => {
                  setTrainStart(e.target.value);
                  setErrors((p) => ({ ...p, trainStart: "", trainEnd: "" }));
                }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
                error={!!errors.trainStart}
                helperText={errors.trainStart}
                disabled={loading}
              />
              <TextField
                label="Fine"
                type="time"
                value={trainEnd}
                onChange={(e) => {
                  setTrainEnd(e.target.value);
                  setErrors((p) => ({ ...p, trainEnd: "" }));
                }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
                error={!!errors.trainEnd}
                helperText={errors.trainEnd}
                disabled={loading}
              />
            </Box>
            <Divider />
            <SessionRestrictionEditor
              value={trainRestrictions}
              onChange={setTrainRestrictions}
              disabled={loading}
              seasonFilter={day ? seasonForDate(day) : undefined}
            />
          </Box>
        )}

        {/* Event form */}
        {tab === "event" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Titolo"
              value={eventTitle}
              onChange={(e) => {
                setEventTitle(e.target.value);
                setErrors((p) => ({ ...p, eventTitle: "" }));
              }}
              fullWidth
              size="small"
              error={!!errors.eventTitle}
              helperText={errors.eventTitle}
              disabled={loading}
              autoFocus
            />
            <TextField
              label="Luogo (opzionale)"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              fullWidth
              size="small"
              disabled={loading}
            />
            <TextField
              label="Data fine (opzionale)"
              type="date"
              value={eventEndDate}
              onChange={(e) => setEventEndDate(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: dateStr } }}
              fullWidth
              disabled={loading}
              helperText="Lascia vuoto per evento di un solo giorno"
            />
          </Box>
        )}

        {/* Match form */}
        {tab === "match" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {teamsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : teams.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                Nessuna squadra disponibile. Creane una nel pannello admin prima di aggiungere
                partite.
              </Typography>
            ) : (
              (() => {
                const matchSeason = seasonForDate(dateStr);
                const filteredTeams = teams.filter((t) => t.season === matchSeason);
                const displayTeams = filteredTeams.length > 0 ? filteredTeams : teams;
                return (
                  <>
                    <FormControl size="small" error={!!errors.matchTeamId} fullWidth>
                      <InputLabel shrink>Squadra</InputLabel>
                      <Select
                        value={matchTeamId}
                        onChange={(e) => {
                          setMatchTeamId(e.target.value);
                          setErrors((p) => ({ ...p, matchTeamId: "" }));
                        }}
                        label="Squadra"
                        notched
                        disabled={loading}
                      >
                        {displayTeams.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.name}
                            {filteredTeams.length === 0 ? ` (${t.season})` : ""}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.matchTeamId && <FormHelperText>{errors.matchTeamId}</FormHelperText>}
                    </FormControl>

                    <FormControl size="small" error={!!errors.matchOpponentId} fullWidth>
                      <InputLabel shrink>Avversario</InputLabel>
                      <Select
                        value={matchOpponentId}
                        onChange={(e) => {
                          setMatchOpponentId(e.target.value);
                          setErrors((p) => ({ ...p, matchOpponentId: "" }));
                        }}
                        label="Avversario"
                        notched
                        disabled={loading}
                        displayEmpty
                      >
                        <MenuItem value="" disabled>
                          <em>Seleziona avversario</em>
                        </MenuItem>
                        {opponents.map((o) => (
                          <MenuItem key={o.id} value={o.id}>
                            {o.name}
                            {o.city ? ` (${o.city})` : ""}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.matchOpponentId && (
                        <FormHelperText>{errors.matchOpponentId}</FormHelperText>
                      )}
                    </FormControl>

                    <TextField
                      label="Orario"
                      type="time"
                      value={matchTime}
                      onChange={(e) => {
                        setMatchTime(e.target.value);
                        setErrors((p) => ({ ...p, matchTime: "" }));
                      }}
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      error={!!errors.matchTime}
                      helperText={errors.matchTime}
                      disabled={loading}
                    />

                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Campo
                      </Typography>
                      <ToggleButtonGroup
                        value={matchIsHome}
                        exclusive
                        onChange={(_, v) => {
                          if (v) setMatchIsHome(v);
                        }}
                        size="small"
                        disabled={loading}
                      >
                        <ToggleButton value="home" sx={{ gap: 0.5 }}>
                          <HomeIcon sx={{ fontSize: "1rem" }} /> Casa
                        </ToggleButton>
                        <ToggleButton value="away" sx={{ gap: 0.5 }}>
                          <FlightIcon sx={{ fontSize: "1rem" }} /> Trasferta
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    <TextField
                      label="Luogo (opzionale)"
                      value={matchVenue}
                      onChange={(e) => setMatchVenue(e.target.value)}
                      fullWidth
                      size="small"
                      disabled={loading}
                    />
                  </>
                );
              })()
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
        <Button onClick={handleClose} color="inherit" size="small" disabled={loading}>
          Annulla
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSubmit}
          disabled={loading || (tab === "match" && (teamsLoading || teams.length === 0))}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
        >
          {loading ? "Creazione..." : "Crea"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
