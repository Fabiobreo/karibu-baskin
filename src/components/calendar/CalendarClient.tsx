"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { Box, Typography, IconButton, Skeleton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import EmptyState from "@/components/common/EmptyState";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addDays,
  getDay,
} from "date-fns";
import type { CalendarEvent } from "@/app/api/calendar/route";
import {
  getDaySegment,
  isVisible,
  spansDay,
  type TeamInfo,
} from "@/components/calendar/calendarShared";
import EventChip from "@/components/calendar/EventChip";
import CalendarLegend from "@/components/calendar/CalendarLegend";
import EventDetailDialog from "@/components/calendar/dialogs/EventDetailDialog";
import DayEventsDialog from "@/components/calendar/dialogs/DayEventsDialog";
import CreateEventDialog from "@/components/calendar/dialogs/CreateEventDialog";
import { TOUCH_TARGET } from "@/lib/touchTarget";

const FILTERS_STORAGE_KEY = "karibu-calendar-filters";

interface Props {
  isStaff?: boolean;
  isAdmin?: boolean;
  teams?: TeamInfo[];
}

export default function CalendarClient({ isStaff = false, isAdmin = false, teams = [] }: Props) {
  const t = useTranslations("calendar");
  const dateLocale = useActiveDateLocale();
  // Compute short day names starting from Monday (2024-01-01 is a Monday)
  const DAY_LABELS = Array.from({ length: 7 }, (_, i) =>
    format(new Date(2024, 0, 1 + i), "EEE", { locale: dateLocale })
  );
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [createDay, setCreateDay] = useState<Date | null>(null);
  const [dayView, setDayView] = useState<Date | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  // Ripristina i filtri persistiti dopo il mount (evita hydration mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setHiddenKeys(new Set(JSON.parse(raw) as string[]));
    } catch {
      // valore corrotto → si riparte senza filtri
    }
  }, []);

  function persistFilters(next: Set<string>) {
    try {
      if (next.size === 0) localStorage.removeItem(FILTERS_STORAGE_KEY);
      else localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // storage non disponibile → filtri solo in memoria
    }
  }

  function toggleKey(key: string) {
    const next = new Set(hiddenKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setHiddenKeys(next);
    persistFilters(next);
  }

  function clearFilters() {
    setHiddenKeys(new Set());
    persistFilters(new Set());
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
  }, [fetchEvents]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const firstDay = startOfMonth(new Date(year, month));
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(firstDay), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsForDay = (day: Date) =>
    events.filter((e) => spansDay(e, day) && isVisible(e, hiddenKeys));

  // Un mese di celle vuote non dice nulla: sotto la griglia va un messaggio.
  const monthHasEvents = days.some((d) => isSameMonth(d, firstDay) && eventsForDay(d).length > 0);

  function handleDayClick(day: Date) {
    const dayEvs = eventsForDay(day);
    // Comportamento unico mobile/desktop: vista giorno; lo staff vi trova "Aggiungi"
    if (dayEvs.length > 0 || isStaff) setDayView(day);
  }

  // Keyboard navigation: ←→ giorno, ↑↓ settimana
  const pendingFocusKey = useRef<string | null>(null);
  useEffect(() => {
    const key = pendingFocusKey.current;
    if (!key) return;
    const el = document.querySelector<HTMLElement>(`[data-day="${key}"]`);
    if (el) {
      el.focus();
      pendingFocusKey.current = null;
    }
  });

  function handleDayKeyDown(e: React.KeyboardEvent, day: Date) {
    let delta = 0;
    if (e.key === "ArrowLeft") delta = -1;
    else if (e.key === "ArrowRight") delta = 1;
    else if (e.key === "ArrowUp") delta = -7;
    else if (e.key === "ArrowDown") delta = 7;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDayClick(day);
      return;
    } else return;

    e.preventDefault();
    const newDay = addDays(day, delta);
    pendingFocusKey.current = newDay.toISOString();
    if (newDay.getFullYear() !== year || newDay.getMonth() !== month) {
      setYear(newDay.getFullYear());
      setMonth(newDay.getMonth());
    } else {
      const el = document.querySelector<HTMLElement>(`[data-day="${newDay.toISOString()}"]`);
      el?.focus();
      pendingFocusKey.current = null;
    }
  }

  return (
    <Box>
      {/* Intestazione mese */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        {/* 44x44: sono l'interazione principale della pagina e stanno
            vicine fra loro. L'icona resta piccola, cresce l'area. */}
        <IconButton onClick={prevMonth} aria-label={t("prevMonth")} sx={TOUCH_TARGET}>
          <ChevronLeftIcon />
        </IconButton>
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
          {format(new Date(year, month), "MMMM yyyy", { locale: dateLocale })}
        </Typography>
        <IconButton onClick={nextMonth} aria-label={t("nextMonth")} sx={TOUCH_TARGET}>
          <ChevronRightIcon />
        </IconButton>
        <Typography
          variant="body2"
          onClick={goToday}
          sx={{
            ml: 0.5,
            cursor: "pointer",
            color: "primary.onLight",
            fontWeight: 600,
            "&:hover": { textDecoration: "underline" },
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
          }}
        >
          {t("todayBtn")}
        </Typography>
      </Box>

      {/* Etichette giorni settimana */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: "1px" }}>
        {DAY_LABELS.map((d) => (
          <Typography
            key={d}
            variant="body2"
            align="center"
            sx={{
              color: "text.secondary",
              fontWeight: 700,
              py: 1,
              fontSize: { xs: "0.7rem", sm: "0.8rem" },
            }}
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
              <Box
                sx={{ display: { xs: "none", sm: "flex" }, flexDirection: "column", gap: "3px" }}
              >
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
                data-day={day.toISOString()}
                tabIndex={isStaff || dayEvents.length > 0 ? 0 : -1}
                onClick={() => handleDayClick(day)}
                onKeyDown={(e) => handleDayKeyDown(e, day)}
                sx={{
                  minHeight: { xs: 72, sm: 116 },
                  bgcolor: "background.paper",
                  p: { xs: "4px", sm: "6px" },
                  opacity: inMonth ? 1 : 0.38,
                  cursor: isStaff || dayEvents.length > 0 ? "pointer" : "default",
                  "&:hover": isStaff || dayEvents.length > 0 ? { bgcolor: "action.hover" } : {},
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: -2,
                    zIndex: 1,
                  },
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
                    color: isCurrentDay
                      ? "common.white"
                      : inMonth
                        ? "text.primary"
                        : "text.disabled",
                    fontSize: { xs: "0.72rem", sm: "0.8rem" },
                    mb: "3px",
                    flexShrink: 0,
                  }}
                >
                  {format(day, "d")}
                </Typography>

                {/* Desktop: chips */}
                <Box
                  sx={{ display: { xs: "none", sm: "flex" }, flexDirection: "column", gap: "3px" }}
                >
                  {visible.map((ev) => {
                    const seg = getDaySegment(ev, day);
                    return (
                      <EventChip
                        key={ev.id}
                        event={ev}
                        segment={seg}
                        // Mostra il titolo all'inizio o a inizio settimana (lunedì),
                        // così ogni riga della griglia resta leggibile.
                        showTitle={seg.isStart || getDay(day) === 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(ev);
                        }}
                      />
                    );
                  })}
                  {extra > 0 && (
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontSize: "0.65rem", pl: "3px" }}
                    >
                      {t("moreEvents", { count: extra })}
                    </Typography>
                  )}
                </Box>

                {/* Mobile: barre colorate con icona — click apre day view */}
                <Box
                  sx={{
                    display: { xs: "flex", sm: "none" },
                    flexDirection: "column",
                    gap: "2px",
                    mt: "2px",
                  }}
                >
                  {visible.map((ev) => {
                    const Icon =
                      ev.type === "training"
                        ? SportsBasketballIcon
                        : ev.type === "match"
                          ? EmojiEventsIcon
                          : EventNoteIcon;
                    const seg = getDaySegment(ev, day);
                    // Barra continua per eventi multi-giorno: bordi smussati solo
                    // alle estremità ed estensione fino al bordo cella.
                    const radius = seg.multiDay
                      ? `${seg.isStart ? "3px" : "0"} ${seg.isEnd ? "3px" : "0"} ${
                          seg.isEnd ? "3px" : "0"
                        } ${seg.isStart ? "3px" : "0"}`
                      : "3px";
                    return (
                      <Box
                        key={ev.id}
                        sx={{
                          height: 14,
                          borderRadius: radius,
                          bgcolor: ev.color,
                          mx: seg.multiDay ? "-4px" : 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {/* Icona solo all'inizio: i giorni di proseguimento restano barra piena */}
                        {(!seg.multiDay || seg.isStart) && (
                          <Icon sx={{ fontSize: "0.58rem", color: "common.white" }} />
                        )}
                      </Box>
                    );
                  })}
                  {extra > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.5rem",
                        color: "text.secondary",
                        textAlign: "center",
                        lineHeight: "12px",
                      }}
                    >
                      +{extra}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {!loading && !monthHasEvents && (
        <EmptyState
          icon={<EventBusyIcon sx={{ fontSize: 56, color: "text.disabled" }} />}
          title={t("noEventsMonth")}
          message={t("noEventsMonthDesc")}
        />
      )}

      {/* Legenda + filtri */}
      <CalendarLegend
        teams={teams}
        year={year}
        month={month}
        hiddenKeys={hiddenKeys}
        onToggleKey={toggleKey}
        onClearFilters={clearFilters}
      />

      {/* Modale dettaglio evento */}
      <EventDetailDialog event={selected} onClose={() => setSelected(null)} isStaff={isStaff} />

      {/* Modale day view */}
      <DayEventsDialog
        day={dayView}
        events={dayView ? eventsForDay(dayView) : []}
        isStaff={isStaff}
        onClose={() => setDayView(null)}
        onSelectEvent={(ev) => {
          setDayView(null);
          setSelected(ev);
        }}
        onAddEvent={() => {
          setCreateDay(dayView);
          setDayView(null);
        }}
      />

      {/* Modale crea evento (solo staff) */}
      {isStaff && (
        <CreateEventDialog
          day={createDay}
          isAdmin={isAdmin}
          onClose={() => setCreateDay(null)}
          onCreated={() => {
            setCreateDay(null);
            fetchEvents();
          }}
        />
      )}
    </Box>
  );
}
