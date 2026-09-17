"use client";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import type { CalendarEvent } from "@/app/api/calendar/route";
import type { DaySegment } from "@/components/calendar/calendarShared";
import { decorationSx, eventVisual } from "@/lib/calendar/eventColors";

/** Chip evento nella cella della griglia (desktop). */
export default function EventChip({
  event,
  segment,
  showTitle = true,
  isOwnTeam = false,
  onClick,
}: {
  event: CalendarEvent;
  segment?: DaySegment;
  showTitle?: boolean;
  /** Impegno di una squadra di chi guarda (o dei suoi figli): va marcato. */
  isOwnTeam?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const theme = useTheme();
  // Sfondo = tipo di evento, bordo sinistro = squadra: vedi eventColors.ts.
  const { bg, fg, accent } = eventVisual(theme, event.type, event.teamColor);

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

  // L'accento squadra sta sul segmento iniziale: ripeterlo a ogni cella
  // spezzerebbe la barra multi-giorno con una riga verticale per giorno.
  const showAccent = !!accent && (!multiDay || (segment?.isStart ?? true));

  return (
    <Box
      onClick={onClick}
      title={event.teamName ? `${event.title} · ${event.teamName}` : event.title}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "3px",
        bgcolor: bg,
        borderRadius,
        ...decorationSx(theme, {
          accent: showAccent ? accent : null,
          // L'eco riprende il colore del chip: lo ribadisce invece di recintarlo.
          echo: isOwnTeam ? bg : null,
        }),
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
        <Icon sx={{ fontSize: "0.68rem", color: fg, flexShrink: 0 }} />
      )}
      {showTitle && (
        <Typography
          variant="caption"
          noWrap
          sx={{
            color: fg,
            fontSize: "0.65rem",
            // Un filo di peso in piu' sugli impegni propri: rinforza l'eco
            // senza aggiungere altra grafica in un chip alto 18px.
            fontWeight: isOwnTeam ? 700 : 600,
            lineHeight: 1.3,
          }}
        >
          {event.title}
          {multiDay && !segment?.isStart ? " (cont.)" : ""}
        </Typography>
      )}
    </Box>
  );
}
