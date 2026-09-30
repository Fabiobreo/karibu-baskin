"use client";
import { Avatar, Box, ListItem, ListItemButton, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    url?: string | null;
    createdAt: string | Date;
    isRead: boolean;
  };
  onRead: (id: string) => void;
}

// Il tipo lo dice la forma dell'icona, non il colore (UX-29): tutte neutre.
const ICON_SX = { color: "text.secondary" } as const;

function NotifIcon({ type }: { type: string }) {
  if (type === "NEW_TRAINING") return <SportsBasketballIcon fontSize="small" sx={ICON_SX} />;
  if (type === "TEAMS_READY") return <GroupsIcon fontSize="small" sx={ICON_SX} />;
  if (type === "MATCH_RESULT") return <EmojiEventsIcon fontSize="small" sx={ICON_SX} />;
  if (type === "LINK_REQUEST" || type === "LINK_RESPONSE")
    return <FamilyRestroomIcon fontSize="small" sx={ICON_SX} />;
  return <NotificationsIcon fontSize="small" sx={ICON_SX} />;
}

export default function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const dateLocale = useActiveDateLocale();
  const { id, type, title, body, url, createdAt, isRead } = notification;

  function markRead() {
    if (isRead) return;
    fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
    onRead(id);
  }

  // Non letta (UX-29): fondo neutro di selezione, titolo in grassetto e un
  // pallino prima del titolo. Il pallino e' arancio solo se la riga si tocca.
  const unreadStyles: SxProps<Theme> = isRead ? {} : { bgcolor: "action.selected" };

  const content = (
    <>
      <Avatar sx={{ width: 36, height: 36, flexShrink: 0, bgcolor: "transparent", mt: 0.25 }}>
        <NotifIcon type={type} />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={isRead ? FONT_WEIGHT.regular : FONT_WEIGHT.semibold}
          sx={{
            lineHeight: 1.3,
            mb: 0.25,
            // Il titolo è il bersaglio del link: si sottolinea in hover come
            // qualunque altro link del sito.
            ...(url ? { color: "primary.onLight" } : {}),
          }}
        >
          {!isRead && (
            <Box
              component="span"
              aria-hidden
              sx={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: url ? "primary.main" : "text.primary",
                mr: 0.75,
                verticalAlign: "middle",
              }}
            />
          )}
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
          {body}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: dateLocale })}
        </Typography>
      </Box>
      {url && (
        <ChevronRightIcon sx={{ fontSize: 20, color: "text.secondary", flexShrink: 0, mt: 0.5 }} />
      )}
    </>
  );

  // Con un `url` la riga è un link vero: si apre in una scheda nuova col
  // tasto centrale, si copia l'indirizzo, e il chevron lo dichiara. Prima era
  // un `role="button"` che navigava via router, senza niente che lo dicesse.
  if (url) {
    return (
      <ListItemButton
        component={Link}
        href={url}
        onClick={markRead}
        sx={{
          alignItems: "flex-start",
          gap: 1.5,
          py: 1.5,
          px: 2,
          textDecoration: "none",
          color: "inherit",
          "&:hover .MuiTypography-body2": { textDecoration: "underline" },
          ...(unreadStyles as object),
        }}
      >
        {content}
      </ListItemButton>
    );
  }

  // Senza `url` non porta da nessuna parte: non deve sembrare cliccabile.
  // `div`: il `<li>` e' il contenitore in NotificheClient/NotificationDropdown,
  // che avvolge anche il divisore.
  return (
    <ListItem
      component="div"
      sx={{ alignItems: "flex-start", gap: 1.5, py: 1.5, px: 2, ...(unreadStyles as object) }}
    >
      {content}
    </ListItem>
  );
}
