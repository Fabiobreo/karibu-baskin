"use client";
import { Box, Typography } from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import type { CalendarEvent } from "@/app/api/calendar/route";
import type { DaySegment } from "@/components/calendar/calendarShared";

/** Chip evento nella cella della griglia (desktop). */
export default function EventChip({
  event,
  segment,
  showTitle = true,
  onClick,
}: {
  event: CalendarEvent;
  segment?: DaySegment;
  showTitle?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const Icon =
    event.type === "training"
      ? SportsBasketballIcon
      : event.type === "match"
        ? EmojiEventsIcon
        : EventNoteIcon;

  const multiDay = segment?.multiDay ?? false;
  // Per gli eventi su più giorni, smussa solo i bordi terminali così che la
  // barra appaia continua attraverso i giorni (inizio → durante → fine).
  const borderRadius = multiDay
    ? `${segment?.isStart ? "4px" : "0"} ${segment?.isEnd ? "4px" : "0"} ${
        segment?.isEnd ? "4px" : "0"
      } ${segment?.isStart ? "4px" : "0"}`
    : "4px";

  return (
    <Box
      onClick={onClick}
      title={event.title}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "3px",
        bgcolor: event.color,
        borderRadius,
        // Estende la barra fino al bordo della cella nei giorni di proseguimento
        // per dare continuità visiva tra celle adiacenti.
        mx: multiDay ? "-6px" : 0,
        px: multiDay ? "8px" : "5px",
        py: "2px",
        minHeight: 18,
        overflow: "hidden",
        cursor: "pointer",
        "&:hover": { filter: "brightness(0.88)" },
        transition: "filter 0.12s",
      }}
    >
      {/* L'icona compare all'inizio dell'evento (o quando mostriamo il titolo) */}
      {(!multiDay || segment?.isStart || showTitle) && (
        <Icon sx={{ fontSize: "0.68rem", color: "common.white", flexShrink: 0 }} />
      )}
      {showTitle && (
        <Typography
          variant="caption"
          noWrap
          sx={{ color: "common.white", fontSize: "0.65rem", fontWeight: 600, lineHeight: 1.3 }}
        >
          {event.title}
          {multiDay && !segment?.isStart ? " (cont.)" : ""}
        </Typography>
      )}
    </Box>
  );
}
