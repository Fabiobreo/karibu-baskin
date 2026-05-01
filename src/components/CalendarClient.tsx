"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, IconButton, CircularProgress, Paper, Skeleton,
  Dialog, DialogContent, DialogActions, Button, Chip, Divider,
  Tabs, Tab, TextField, ToggleButton, ToggleButtonGroup, MenuItem,
  Select, FormControl, InputLabel, FormHelperText,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceIcon from "@mui/icons-material/Place";
import GroupsIcon from "@mui/icons-material/Groups";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import HomeIcon from "@mui/icons-material/Home";
import FlightIcon from "@mui/icons-material/Flight";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
} from "date-fns";
import { it } from "date-fns/locale";
import type { CalendarEvent } from "@/app/api/calendar/route";
import { useToast } from "@/context/ToastContext";
import SessionRestrictionEditor, { seasonForDate, type RestrictionValue } from "@/components/SessionRestrictionEditor";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const RESULT_LABELS: Record<string, string> = {
  WIN: "Vittoria",
  LOSS: "Sconfitta",
  DRAW: "Pareggio",
};
const RESULT_COLORS: Record<string, string> = {
  WIN: "#2E7D32",
  LOSS: "#C62828",
  DRAW: "#E65100",
};
const TYPE_LABELS: Record<string, string> = {
  training: "Allenamento",
  match: "Partita",
  event: "Evento",
};

interface TeamInfo {
  id: string;
  name: string;
  season: string;
  color: string | null;
}

interface Props {
  isStaff?: boolean;
  isAdmin?: boolean;
  teams?: TeamInfo[];
}

function isVisible(ev: CalendarEvent, hidden: Set<string>): boolean {
  if (ev.type === "training") return !hidden.has("training");
  if (ev.type === "event")    return !hidden.has("event");
  if (ev.type === "match")    return !hidden.has(`match:${ev.color}`) && !hidden.has("match:*");
  return true;
}

export default function CalendarClient({ isStaff = false, isAdmin = false, teams = [] }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [createDay, setCreateDay] = useState<Date | null>(null);
  const [dayView, setDayView] = useState<Date | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  function toggleKey(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${monthKey}`);
      if (res.ok) setEvents(await res.json());
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const firstDay = startOfMonth(new Date(year, month));
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(firstDay), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.date), day) && isVisible(e, hiddenKeys));

  function handleDayClick(day: Date) {
    const dayEvs = eventsForDay(day);
    // Su mobile mostra sempre il day view; su desktop apre creazione solo per staff
    if (window.innerWidth < 600) {
      if (dayEvs.length > 0 || isStaff) setDayView(day);
    } else if (isStaff) {
      setCreateDay(day);
    }
  }

  return (
    <Box>
      {/* Intestazione mese */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <IconButton onClick={prevMonth} size="small" aria-label="Mese precedente"><ChevronLeftIcon /></IconButton>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{
            textTransform: "capitalize",
            minWidth: { xs: 130, sm: 220 },
            textAlign: "center",
            fontSize: { xs: "1.05rem", sm: "1.5rem" },
          }}
        >
          {format(new Date(year, month), "MMMM yyyy", { locale: it })}
        </Typography>
        <IconButton onClick={nextMonth} size="small" aria-label="Mese successivo"><ChevronRightIcon /></IconButton>
        <Typography
          variant="body2"
          onClick={goToday}
          sx={{ ml: 0.5, cursor: "pointer", color: "primary.main", fontWeight: 600, "&:hover": { textDecoration: "underline" }, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          Oggi
        </Typography>
      </Box>

      {/* Etichette giorni settimana */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: "1px" }}>
        {DAY_LABELS.map((d) => (
          <Typography
            key={d}
            variant="body2"
            align="center"
            sx={{ color: "text.secondary", fontWeight: 700, py: 1, fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
          >
            {d}
          </Typography>
        ))}
      </Box>

      {/* Griglia */}
      {loading ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "1px",
            bgcolor: "divider",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 42 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                minHeight: { xs: 72, sm: 116 },
                bgcolor: "background.paper",
                p: { xs: "4px", sm: "6px" },
              }}
            >
              <Skeleton variant="circular" width={26} height={26} sx={{ mb: "3px" }} />
              <Box sx={{ display: { xs: "none", sm: "flex" }, flexDirection: "column", gap: "3px" }}>
                {i % 4 === 0 && <Skeleton variant="rounded" height={20} />}
                {i % 7 === 1 && <Skeleton variant="rounded" height={20} />}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "1px",
            bgcolor: "divider",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          {days.map((day) => {
            const dayEvents = eventsForDay(day);
            const inMonth = isSameMonth(day, new Date(year, month));
            const isCurrentDay = isToday(day);
            const maxVisible = 3;
            const visible = dayEvents.slice(0, maxVisible);
            const extra = dayEvents.length - maxVisible;

            return (
              <Box
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                sx={{
                  minHeight: { xs: 72, sm: 116 },
                  bgcolor: "background.paper",
                  p: { xs: "4px", sm: "6px" },
                  opacity: inMonth ? 1 : 0.38,
                  cursor: (isStaff || dayEvents.length > 0) ? "pointer" : "default",
                  "&:hover": (isStaff || dayEvents.length > 0) ? { bgcolor: "action.hover" } : {},
                  transition: "background-color 0.12s",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: { xs: 22, sm: 26 },
                    height: { xs: 22, sm: 26 },
                    borderRadius: "50%",
                    fontWeight: isCurrentDay ? 800 : 500,
                    bgcolor: isCurrentDay ? "primary.main" : "transparent",
                    color: isCurrentDay ? "#fff" : inMonth ? "text.primary" : "text.disabled",
                    fontSize: { xs: "0.72rem", sm: "0.8rem" },
                    mb: "3px",
                    flexShrink: 0,
                  }}
                >
                  {format(day, "d")}
                </Typography>

                {/* Desktop: chips */}
                <Box sx={{ display: { xs: "none", sm: "flex" }, flexDirection: "column", gap: "3px" }}>
                  {visible.map((ev) => (
                    <EventChip key={ev.id} event={ev} onClick={(e) => { e.stopPropagation(); setSelected(ev); }} />
                  ))}
                  {extra > 0 && (
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", pl: "3px" }}>
                      +{extra} altri
                    </Typography>
                  )}
                </Box>

                {/* Mobile: colored dots — click apre day view */}
                <Box sx={{ display: { xs: "flex", sm: "none" }, gap: "3px", flexWrap: "wrap", mt: "2px" }}>
                  {visible.map((ev) => (
                    <Box
                      key={ev.id}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: ev.color,
                        flexShrink: 0,
                      }}
                    />
                  ))}
                  {extra > 0 && (
                    <Typography variant="caption" sx={{ fontSize: "0.55rem", color: "text.secondary", lineHeight: "8px" }}>
                      +{extra}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Legenda */}
      {(() => {
        const viewedSeason = seasonForDate(new Date(year, month, 1));
        const seasonTeams = teams.filter((t) => t.season === viewedSeason);
        return (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 3, alignItems: "center" }}>
            <LegendItem
              color="#FF6D00"
              icon={<SportsBasketballIcon sx={{ fontSize: "0.8rem", color: "#fff" }} />}
              label="Allenamento"
              active={!hiddenKeys.has("training")}
              onClick={() => toggleKey("training")}
            />
            {seasonTeams.length > 0 ? (
              seasonTeams.map((t) => {
                const matchKey = `match:${t.color ?? "#C62828"}`;
                return (
                  <LegendItem
                    key={t.id}
                    color={t.color ?? "#C62828"}
                    icon={<EmojiEventsIcon sx={{ fontSize: "0.8rem", color: "#fff" }} />}
                    label={t.name}
                    active={!hiddenKeys.has(matchKey)}
                    onClick={() => toggleKey(matchKey)}
                  />
                );
              })
            ) : (
              <LegendItem
                color="#F44336"
                icon={<EmojiEventsIcon sx={{ fontSize: "0.8rem", color: "#fff" }} />}
                label="Partita"
                active={!hiddenKeys.has("match:*")}
                onClick={() => toggleKey("match:*")}
              />
            )}
            <LegendItem
              color="#039BE5"
              icon={<EventNoteIcon sx={{ fontSize: "0.8rem", color: "#fff" }} />}
              label="Evento"
              active={!hiddenKeys.has("event")}
              onClick={() => toggleKey("event")}
            />
          </Box>
        );
      })()}

      {/* Modale dettaglio evento */}
      <EventDetailDialog event={selected} onClose={() => setSelected(null)} isStaff={isStaff} />

      {/* Modale day view (mobile) */}
      <DayEventsDialog
        day={dayView}
        events={dayView ? eventsForDay(dayView) : []}
        isStaff={isStaff}
        onClose={() => setDayView(null)}
        onSelectEvent={(ev) => { setDayView(null); setSelected(ev); }}
        onAddEvent={() => { setCreateDay(dayView); setDayView(null); }}
      />

      {/* Modale crea evento (solo staff) */}
      {isStaff && (
        <CreateEventDialog
          day={createDay}
          isAdmin={isAdmin}
          onClose={() => setCreateDay(null)}
          onCreated={() => { setCreateDay(null); fetchEvents(); }}
        />
      )}
    </Box>
  );
}

// ── Chip evento nella griglia ─────────────────────────────────────────────────

function EventChip({ event, onClick }: { event: CalendarEvent; onClick: (e: React.MouseEvent) => void }) {
  const Icon =
    event.type === "training" ? SportsBasketballIcon
    : event.type === "match" ? EmojiEventsIcon
    : EventNoteIcon;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "3px",
        bgcolor: event.color,
        borderRadius: "4px",
        px: "5px",
        py: "2px",
        overflow: "hidden",
        cursor: "pointer",
        "&:hover": { filter: "brightness(0.88)" },
        transition: "filter 0.12s",
      }}
    >
      <Icon sx={{ fontSize: "0.68rem", color: "#fff", flexShrink: 0 }} />
      <Typography
        variant="caption"
        noWrap
        sx={{ color: "#fff", fontSize: "0.65rem", fontWeight: 600, lineHeight: 1.3 }}
      >
        {event.title}
      </Typography>
    </Box>
  );
}

// ── Modale dettaglio ──────────────────────────────────────────────────────────

function EventDetailDialog({
  event, onClose, isStaff,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  isStaff: boolean;
}) {
  if (!event) return null;

  const Icon =
    event.type === "training" ? SportsBasketballIcon
    : event.type === "match" ? EmojiEventsIcon
    : EventNoteIcon;

  const editHref =
    event.type === "training" ? `/allenamenti?edit=${event.id}`
    : event.type === "match" ? `/admin/partite?edit=${event.id}`
    : `/admin/eventi?edit=${event.id}`;

  const dateStart = new Date(event.date);
  const dateEnd = event.endDate ? new Date(event.endDate) : null;

  const isSameDay_ = dateEnd && format(dateStart, "yyyy-MM-dd") === format(dateEnd, "yyyy-MM-dd");

  const dateLabel = dateEnd
    ? isSameDay_
      ? `${format(dateStart, "EEEE d MMMM yyyy", { locale: it })} · ${format(dateStart, "HH:mm")}–${format(dateEnd, "HH:mm")}`
      : `${format(dateStart, "d MMM yyyy", { locale: it })} → ${format(dateEnd, "d MMM yyyy", { locale: it })}`
    : `${format(dateStart, "EEEE d MMMM yyyy", { locale: it })} · ore ${format(dateStart, "HH:mm")}`;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      {/* Banner colorato */}
      <Box
        sx={{
          bgcolor: event.color,
          px: 3,
          pt: 3,
          pb: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon sx={{ color: "#fff", fontSize: "1.3rem" }} />
        </Box>
        <Box sx={{ overflow: "hidden", flex: 1 }}>
          <Chip
            label={TYPE_LABELS[event.type]}
            size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 700, fontSize: "0.68rem", mb: 0.5 }}
          />
          <Typography variant="h6" fontWeight={800} sx={{ color: "#fff", lineHeight: 1.2 }}>
            {event.title}
          </Typography>
        </Box>
        {isStaff && editHref && (
          <IconButton
            component={Link}
            href={editHref}
            onClick={onClose}
            size="small"
            sx={{ color: "rgba(255,255,255,0.85)", "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.15)" }, flexShrink: 0 }}
            title="Modifica"
            aria-label="Modifica evento"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <DialogContent sx={{ pt: 2.5, pb: 1 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>

          {/* Data/ora */}
          <InfoRow icon={<AccessTimeIcon />} text={dateLabel} />

          {/* Squadra */}
          {event.teamName && (
            <InfoRow icon={<GroupsIcon />} text={event.teamName} />
          )}

          {/* Avversario (partite) */}
          {event.type === "match" && event.opponent && (
            <InfoRow
              icon={<EmojiEventsIcon />}
              text={event.isHome ? `In casa vs ${event.opponent}` : `In trasferta @ ${event.opponent}`}
            />
          )}

          {/* Risultato (partite) */}
          {event.result && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 20, height: 20, flexShrink: 0 }} />
              <Chip
                label={RESULT_LABELS[event.result]}
                size="small"
                sx={{
                  bgcolor: RESULT_COLORS[event.result] ?? "grey.500",
                  color: "#fff",
                  fontWeight: 700,
                }}
              />
            </Box>
          )}

          {/* Luogo */}
          {event.location && (
            <InfoRow icon={<PlaceIcon />} text={event.location} />
          )}
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" size="small">Chiudi</Button>
        {event.href && (
          <Button
            component={Link}
            href={event.href}
            variant="contained"
            endIcon={<OpenInNewIcon fontSize="small" />}
            onClick={onClose}
            size="small"
          >
            Vai alla pagina
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Day view dialog (mobile) ──────────────────────────────────────────────────

function DayEventsDialog({
  day, events, isStaff, onClose, onSelectEvent, onAddEvent,
}: {
  day: Date | null;
  events: CalendarEvent[];
  isStaff: boolean;
  onClose: () => void;
  onSelectEvent: (ev: CalendarEvent) => void;
  onAddEvent: () => void;
}) {
  if (!day) return null;

  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dayLabel = format(day, "EEEE d MMMM", { locale: it });

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight={700} sx={{ textTransform: "capitalize" }}>
          {dayLabel}
        </Typography>
        {isStaff && (
          <Button size="small" startIcon={<AddIcon />} onClick={onAddEvent} variant="outlined">
            Aggiungi
          </Button>
        )}
      </Box>
      <DialogContent sx={{ pt: 0.5, pb: 1 }}>
        {sorted.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Nessun evento in questo giorno.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {sorted.map((ev) => {
              const Icon =
                ev.type === "training" ? SportsBasketballIcon
                : ev.type === "match" ? EmojiEventsIcon
                : EventNoteIcon;

              const rowSx = {
                display: "flex", alignItems: "center", gap: 1.5,
                p: 1.25, borderRadius: 1, cursor: "pointer",
                bgcolor: `${ev.color}18`,
                border: "1px solid", borderColor: `${ev.color}44`,
                "&:hover": { bgcolor: `${ev.color}28` },
                textDecoration: "none", color: "inherit",
              };

              const inner = (
                <>
                  <Box sx={{
                    width: 32, height: 32, borderRadius: "50%",
                    bgcolor: ev.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon sx={{ color: "#fff", fontSize: "1rem" }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{ev.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(ev.date), "HH:mm")}
                      {ev.endDate && ` – ${format(new Date(ev.endDate), "HH:mm")}`}
                    </Typography>
                  </Box>
                  <ChevronRightIcon sx={{ fontSize: 18, color: "text.disabled", flexShrink: 0 }} />
                </>
              );

              return ev.href ? (
                <Box key={ev.id} component={Link} href={ev.href} onClick={onClose} sx={rowSx}>
                  {inner}
                </Box>
              ) : (
                <Box key={ev.id} onClick={() => onSelectEvent(ev)} sx={rowSx}>
                  {inner}
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" size="small">Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Modale crea evento ────────────────────────────────────────────────────────

type CreateType = "training" | "event" | "match";

interface CompetitiveTeam { id: string; name: string; season: string; color?: string | null; }
interface OpposingTeam { id: string; name: string; city?: string | null; }


function CreateEventDialog({
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
  const [tab, setTab] = useState<CreateType>("training");
  const [loading, setLoading] = useState(false);

  // Training fields
  const [trainTitle, setTrainTitle] = useState("Allenamento settimanale");
  const [trainStart, setTrainStart] = useState("18:00");
  const [trainEnd, setTrainEnd] = useState("20:00");
  const [trainRestrictions, setTrainRestrictions] = useState<RestrictionValue>({ allowedRoles: [], restrictTeamId: null, openRoles: [] });

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
  const dateLabelFull = day ? format(day, "EEEE d MMMM yyyy", { locale: it }) : "";

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
        const data = await res.json().catch(() => ({}));
        showToast({ message: data.error ?? "Errore nella creazione", severity: "error" });
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
      <Box sx={{ bgcolor: "primary.main", px: 3, pt: 2.5, pb: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <AddIcon sx={{ color: "#fff", fontSize: "1.2rem" }} />
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, textTransform: "capitalize" }}>
            {dateLabelFull}
          </Typography>
          <Typography variant="h6" fontWeight={800} sx={{ color: "#fff", lineHeight: 1.2 }}>
            Nuovo evento
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v as CreateType); setErrors({}); }}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="training" label="Allenamento" icon={<SportsBasketballIcon sx={{ fontSize: "1rem" }} />} iconPosition="start" sx={{ fontSize: "0.78rem", minHeight: 48 }} />
          <Tab value="event" label="Evento" icon={<EventNoteIcon sx={{ fontSize: "1rem" }} />} iconPosition="start" sx={{ fontSize: "0.78rem", minHeight: 48 }} />
          {isAdmin && (
            <Tab value="match" label="Partita" icon={<EmojiEventsIcon sx={{ fontSize: "1rem" }} />} iconPosition="start" sx={{ fontSize: "0.78rem", minHeight: 48 }} />
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
              onChange={(e) => { setTrainTitle(e.target.value); setErrors((p) => ({ ...p, trainTitle: "" })); }}
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
                onChange={(e) => { setTrainStart(e.target.value); setErrors((p) => ({ ...p, trainStart: "", trainEnd: "" })); }}
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
                onChange={(e) => { setTrainEnd(e.target.value); setErrors((p) => ({ ...p, trainEnd: "" })); }}
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
              onChange={(e) => { setEventTitle(e.target.value); setErrors((p) => ({ ...p, eventTitle: "" })); }}
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
                Nessuna squadra disponibile. Creane una nel pannello admin prima di aggiungere partite.
              </Typography>
            ) : (() => {
                const matchSeason = seasonForDate(dateStr);
                const filteredTeams = teams.filter((t) => t.season === matchSeason);
                const displayTeams = filteredTeams.length > 0 ? filteredTeams : teams;
                return (
              <>
                <FormControl size="small" error={!!errors.matchTeamId} fullWidth>
                  <InputLabel shrink>Squadra</InputLabel>
                  <Select
                    value={matchTeamId}
                    onChange={(e) => { setMatchTeamId(e.target.value); setErrors((p) => ({ ...p, matchTeamId: "" })); }}
                    label="Squadra"
                    notched
                    disabled={loading}
                  >
                    {displayTeams.map((t) => (
                      <MenuItem key={t.id} value={t.id}>{t.name}{filteredTeams.length === 0 ? ` (${t.season})` : ""}</MenuItem>
                    ))}
                  </Select>
                  {errors.matchTeamId && <FormHelperText>{errors.matchTeamId}</FormHelperText>}
                </FormControl>

                <FormControl size="small" error={!!errors.matchOpponentId} fullWidth>
                  <InputLabel shrink>Avversario</InputLabel>
                  <Select
                    value={matchOpponentId}
                    onChange={(e) => { setMatchOpponentId(e.target.value); setErrors((p) => ({ ...p, matchOpponentId: "" })); }}
                    label="Avversario"
                    notched
                    disabled={loading}
                    displayEmpty
                  >
                    <MenuItem value="" disabled><em>Seleziona avversario</em></MenuItem>
                    {opponents.map((o) => (
                      <MenuItem key={o.id} value={o.id}>{o.name}{o.city ? ` (${o.city})` : ""}</MenuItem>
                    ))}
                  </Select>
                  {errors.matchOpponentId && <FormHelperText>{errors.matchOpponentId}</FormHelperText>}
                </FormControl>

                <TextField
                  label="Orario"
                  type="time"
                  value={matchTime}
                  onChange={(e) => { setMatchTime(e.target.value); setErrors((p) => ({ ...p, matchTime: "" })); }}
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
                    onChange={(_, v) => { if (v) setMatchIsHome(v); }}
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
            }
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
        <Button onClick={handleClose} color="inherit" size="small" disabled={loading}>Annulla</Button>
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

// ── Helper ────────────────────────────────────────────────────────────────────

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
      <Box sx={{ color: "text.secondary", mt: "1px", "& svg": { fontSize: "1.1rem" } }}>{icon}</Box>
      <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{text}</Typography>
    </Box>
  );
}

function LegendItem({ color, icon, label, active = true, onClick }: {
  color: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        cursor: onClick ? "pointer" : "default",
        opacity: active ? 1 : 0.38,
        transition: "opacity 0.15s",
        userSelect: "none",
        "&:hover": onClick ? { opacity: active ? 0.75 : 0.55 } : {},
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          bgcolor: active ? color : "action.disabled",
          borderRadius: "4px",
          transition: "background-color 0.15s",
        }}
      >
        {icon}
      </Paper>
      <Typography
        variant="body2"
        sx={{
          color: active ? "text.secondary" : "text.disabled",
          textDecoration: active ? "none" : "line-through",
          transition: "color 0.15s",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
