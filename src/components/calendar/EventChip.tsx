"use client";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import type { CalendarEvent } from "@/app/api/calendar/route";
import type { DaySegment } from "@/components/calendar/calendarShared";
import { decorationSx, echoColor, eventVisual, surfaceSx } from "@/lib/calendar/eventColors";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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
  // Forma + icona = tipo, fascia sinistra = squadra: vedi eventColors.ts.
  const visual = eventVisual(theme, event.type, event.teamColor);
  const { fg, accent } = visual;

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
        ...surfaceSx(visual),
        // Multi-giorno: il contorno si chiude solo alle estremita', cosi' la
        // barra resta continua fra le celle.
        ...(multiDay && !segment?.isStart ? { borderLeftWidth: 0 } : {}),
        ...(multiDay && !segment?.isEnd ? { borderRightWidth: 0 } : {}),
        borderRadius,
        ...decorationSx(theme, {
          accent: showAccent ? accent : null,
          // Eco nella tinta della squadra (inchiostro se non ne ha una).
          echo: isOwnTeam ? echoColor(theme, visual) : null,
        }),
        // Estende la barra fino al bordo della cella nei giorni di proseguimento
        // per dare continuità visiva tra celle adiacenti.
        mx: multiDay ? "-6px" : 0,
        px: multiDay ? "8px" : "5px",
        py: "1px",
        minHeight: 18,
        overflow: "hidden",
        cursor: "pointer",
        "&:hover": { bgcolor: visual.hover },
        transition: "background-color 0.12s",
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
            fontSize: TYPE_SCALE.xs,
            // Un filo di peso in piu' sugli impegni propri: rinforza l'eco
            // senza aggiungere altra grafica in un chip alto 18px.
            fontWeight: isOwnTeam ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
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
