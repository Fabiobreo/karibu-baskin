"use client";
import { Box, Button, Dialog, DialogActions, DialogContent, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import Link from "next/link";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { getDaySegment } from "@/components/calendar/calendarShared";
import type { CalendarEvent } from "@/app/api/calendar/route";
import { eventVisual } from "@/lib/calendar/eventColors";

interface DayEventsDialogProps {
  day: Date | null;
  events: CalendarEvent[];
  isStaff: boolean;
  onClose: () => void;
  onSelectEvent: (ev: CalendarEvent) => void;
  onAddEvent: () => void;
}

/** Vista giorno: lista degli eventi del giorno selezionato, con "Aggiungi" per lo staff. */
export default function DayEventsDialog({
  day,
  events,
  isStaff,
  onClose,
  onSelectEvent,
  onAddEvent,
}: DayEventsDialogProps) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const dateLocale = useActiveDateLocale();
  const theme = useTheme();
  if (!day) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const dayLabel = format(day, "EEEE d MMMM", { locale: dateLocale });

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <Box
        sx={{
          px: 2.5,
          pt: 2.5,
          pb: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ textTransform: "capitalize" }}>
          {dayLabel}
        </Typography>
        {isStaff && (
          <Button size="small" startIcon={<AddIcon />} onClick={onAddEvent} variant="outlined">
            {tCommon("add")}
          </Button>
        )}
      </Box>
      <DialogContent sx={{ pt: 0.5, pb: 1 }}>
        {sorted.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            {t("noEvents")}
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {sorted.map((ev) => {
              const Icon =
                ev.type === "training"
                  ? SportsBasketballIcon
                  : ev.type === "match"
                    ? EmojiEventsIcon
                    : EventNoteIcon;

              // Velatura del colore di tipo (prima era concatenazione di hex,
              // che si rompe su qualunque colore non #rrggbb) + accento squadra
              // sul bordo sinistro, come nei chip della griglia.
              const { bg, fg, accent, tint, tintBorder, tintHover } = eventVisual(
                theme,
                ev.type,
                ev.teamColor
              );

              const rowSx = {
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.25,
                borderRadius: 1,
                cursor: "pointer",
                bgcolor: tint,
                border: "1px solid",
                borderColor: tintBorder,
                borderLeft: accent ? `4px solid ${accent}` : undefined,
                "&:hover": { bgcolor: tintHover },
                textDecoration: "none",
                color: "inherit",
              };

              const inner = (
                <>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon sx={{ color: fg, fontSize: "1rem" }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {ev.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(() => {
                        const seg = getDaySegment(ev, day);
                        if (seg.multiDay) {
                          // Evento su più giorni: mostra l'intervallo di date
                          return `${format(new Date(ev.date), "d MMM", { locale: dateLocale })} → ${format(
                            new Date(ev.endDate!),
                            "d MMM",
                            { locale: dateLocale }
                          )}`;
                        }
                        return (
                          format(new Date(ev.date), "HH:mm") +
                          (ev.endDate ? ` – ${format(new Date(ev.endDate), "HH:mm")}` : "")
                        );
                      })()}
                      {ev.teamName ? ` · ${ev.teamName}` : ""}
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
                <Box
                  key={ev.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectEvent(ev)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectEvent(ev);
                    }
                  }}
                  sx={{
                    ...rowSx,
                    "&:focus-visible": {
                      outline: "2px solid",
                      outlineColor: "primary.main",
                      outlineOffset: 2,
                    },
                  }}
                >
                  {inner}
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" size="small">
          {tCommon("close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
