"use client";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceIcon from "@mui/icons-material/Place";
import GroupsIcon from "@mui/icons-material/Groups";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EditIcon from "@mui/icons-material/Edit";
import Link from "next/link";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import type { CalendarEvent } from "@/app/api/calendar/route";

const RESULT_COLORS: Record<string, string> = {
  WIN: "match.win",
  LOSS: "match.loss",
  DRAW: "primary.main",
};

/** Modale di dettaglio evento del calendario (read-only, con matita per lo staff). */
export default function EventDetailDialog({
  event,
  onClose,
  isStaff,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  isStaff: boolean;
}) {
  const t = useTranslations("calendar");
  const tCommon = useTranslations("common");
  const dateLocale = useActiveDateLocale();
  const { matchResultLabel } = useEntityLabels();
  if (!event) return null;

  const Icon =
    event.type === "training"
      ? SportsBasketballIcon
      : event.type === "match"
        ? EmojiEventsIcon
        : EventNoteIcon;

  const editHref =
    event.type === "training"
      ? `/allenamenti?edit=${event.id}`
      : event.type === "match"
        ? `/admin/partite?edit=${event.id}`
        : `/admin/eventi?edit=${event.id}`;

  const dateStart = new Date(event.date);
  const dateEnd = event.endDate ? new Date(event.endDate) : null;

  const isSameDay_ = dateEnd && format(dateStart, "yyyy-MM-dd") === format(dateEnd, "yyyy-MM-dd");

  const dateLabel = dateEnd
    ? isSameDay_
      ? `${format(dateStart, "EEEE d MMMM yyyy", { locale: dateLocale })} · ${format(dateStart, "HH:mm")}–${format(dateEnd, "HH:mm")}`
      : `${format(dateStart, "d MMM yyyy", { locale: dateLocale })} → ${format(dateEnd, "d MMM yyyy", { locale: dateLocale })}`
    : `${format(dateStart, "EEEE d MMMM yyyy", { locale: dateLocale })} · ${format(dateStart, "HH:mm")}`;

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
            bgcolor: (theme) => alpha(theme.palette.common.white, 0.2),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon sx={{ color: "common.white", fontSize: "1.3rem" }} />
        </Box>
        <Box sx={{ overflow: "hidden", flex: 1 }}>
          <Chip
            label={
              event.type === "training"
                ? t("typeTraining")
                : event.type === "match"
                  ? t("typeMatch")
                  : t("typeEvent")
            }
            size="small"
            sx={{
              bgcolor: (theme) => alpha(theme.palette.common.white, 0.25),
              color: "common.white",
              fontWeight: 700,
              fontSize: "0.68rem",
              mb: 0.5,
            }}
          />
          <Typography variant="h6" fontWeight={800} sx={{ color: "common.white", lineHeight: 1.2 }}>
            {event.title}
          </Typography>
        </Box>
        {isStaff && editHref && (
          <IconButton
            component={Link}
            href={editHref}
            onClick={onClose}
            size="small"
            sx={{
              color: (theme) => alpha(theme.palette.common.white, 0.85),
              "&:hover": {
                color: "common.white",
                bgcolor: (theme) => alpha(theme.palette.common.white, 0.15),
              },
              flexShrink: 0,
            }}
            title={tCommon("edit")}
            aria-label={tCommon("edit")}
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
          {event.teamName && <InfoRow icon={<GroupsIcon />} text={event.teamName} />}

          {/* Avversario (partite) */}
          {event.type === "match" && event.opponent && (
            <InfoRow
              icon={<EmojiEventsIcon />}
              text={
                event.isHome
                  ? t("homeVs", { opponent: event.opponent })
                  : t("awayAt", { opponent: event.opponent })
              }
            />
          )}

          {/* Risultato (partite) */}
          {event.result && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 20, height: 20, flexShrink: 0 }} />
              <Chip
                label={matchResultLabel(event.result as "WIN" | "LOSS" | "DRAW")}
                size="small"
                sx={{
                  bgcolor: RESULT_COLORS[event.result] ?? "grey.500",
                  color: "common.white",
                  fontWeight: 700,
                }}
              />
            </Box>
          )}

          {/* Luogo */}
          {event.location && <InfoRow icon={<PlaceIcon />} text={event.location} />}
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" size="small">
          {tCommon("close")}
        </Button>
        {event.href && (
          <Button
            component={Link}
            href={event.href}
            variant="contained"
            endIcon={<OpenInNewIcon fontSize="small" />}
            onClick={onClose}
            size="small"
          >
            {t("viewPage")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
      <Box sx={{ color: "text.secondary", mt: "1px", "& svg": { fontSize: "1.1rem" } }}>{icon}</Box>
      <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
        {text}
      </Typography>
    </Box>
  );
}
