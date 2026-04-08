"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, IconButton, CircularProgress, Paper,
  Dialog, DialogContent, DialogActions, Button, Chip, Divider,
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

export default function CalendarClient() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

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
    events.filter((e) => isSameDay(new Date(e.date), day));

  return (
    <Box>
      {/* Intestazione mese */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <IconButton onClick={prevMonth}><ChevronLeftIcon /></IconButton>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ textTransform: "capitalize", minWidth: 220, textAlign: "center" }}
        >
          {format(new Date(year, month), "MMMM yyyy", { locale: it })}
        </Typography>
        <IconButton onClick={nextMonth}><ChevronRightIcon /></IconButton>
        <Typography
          variant="body2"
          onClick={goToday}
          sx={{ ml: 1, cursor: "pointer", color: "primary.main", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
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
            sx={{ color: "text.secondary", fontWeight: 700, py: 1, fontSize: "0.8rem" }}
          >
            {d}
          </Typography>
        ))}
      </Box>

      {/* Griglia */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
          <CircularProgress size={36} />
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
                sx={{
                  minHeight: { xs: 86, sm: 116 },
                  bgcolor: "background.paper",
                  p: { xs: "4px", sm: "6px" },
                  opacity: inMonth ? 1 : 0.38,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    fontWeight: isCurrentDay ? 800 : 500,
                    bgcolor: isCurrentDay ? "primary.main" : "transparent",
                    color: isCurrentDay ? "#fff" : inMonth ? "text.primary" : "text.disabled",
                    fontSize: "0.8rem",
                    mb: "3px",
                    flexShrink: 0,
                  }}
                >
                  {format(day, "d")}
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {visible.map((ev) => (
                    <EventChip key={ev.id} event={ev} onClick={() => setSelected(ev)} />
                  ))}
                  {extra > 0 && (
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", pl: "3px" }}>
                      +{extra} altri
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Legenda */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 3 }}>
        <LegendItem color="#E65100" icon={<SportsBasketballIcon sx={{ fontSize: "0.8rem", color: "#fff" }} />} label="Allenamento" />
        <LegendItem color="#C62828" icon={<EmojiEventsIcon sx={{ fontSize: "0.8rem", color: "#fff" }} />} label="Partita" />
        <LegendItem color="#1565C0" icon={<EventNoteIcon sx={{ fontSize: "0.8rem", color: "#fff" }} />} label="Evento" />
      </Box>

      {/* Modale dettaglio evento */}
      <EventDetailDialog event={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}

// ── Chip evento nella griglia ─────────────────────────────────────────────────

function EventChip({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
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
        sx={{ color: "#fff", fontSize: { xs: "0.6rem", sm: "0.65rem" }, fontWeight: 600, lineHeight: 1.3 }}
      >
        {event.title}
      </Typography>
    </Box>
  );
}

// ── Modale dettaglio ──────────────────────────────────────────────────────────

function EventDetailDialog({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  if (!event) return null;

  const Icon =
    event.type === "training" ? SportsBasketballIcon
    : event.type === "match" ? EmojiEventsIcon
    : EventNoteIcon;

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
        <Box sx={{ overflow: "hidden" }}>
          <Chip
            label={TYPE_LABELS[event.type]}
            size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 700, fontSize: "0.68rem", mb: 0.5 }}
          />
          <Typography variant="h6" fontWeight={800} sx={{ color: "#fff", lineHeight: 1.2 }}>
            {event.title}
          </Typography>
        </Box>
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

// ── Helper ────────────────────────────────────────────────────────────────────

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
      <Box sx={{ color: "text.secondary", mt: "1px", "& svg": { fontSize: "1.1rem" } }}>{icon}</Box>
      <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{text}</Typography>
    </Box>
  );
}

function LegendItem({ color, icon, label }: { color: string; icon: React.ReactNode; label: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Paper
        elevation={0}
        sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, bgcolor: color, borderRadius: "4px" }}
      >
        {icon}
      </Paper>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Box>
  );
}
