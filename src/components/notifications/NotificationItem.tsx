"use client";
import { Avatar, Box, ListItem, ListItemButton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
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

function NotifIcon({ type }: { type: string }) {
  if (type === "NEW_TRAINING") return <SportsBasketballIcon fontSize="small" color="primary" />;
  if (type === "TEAMS_READY") return <GroupsIcon fontSize="small" color="success" />;
  if (type === "MATCH_RESULT") return <EmojiEventsIcon fontSize="small" color="warning" />;
  if (type === "LINK_REQUEST" || type === "LINK_RESPONSE")
    return <FamilyRestroomIcon fontSize="small" color="secondary" />;
  return <NotificationsIcon fontSize="small" color="action" />;
}

export default function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const dateLocale = useActiveDateLocale();
  const { id, type, title, body, url, createdAt, isRead } = notification;

  function markRead() {
    if (isRead) return;
    fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
    onRead(id);
  }

  const unreadStyles: SxProps<Theme> = isRead
    ? {}
    : {
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
        borderLeft: "3px solid",
        borderColor: "primary.main",
      };

  const content = (
    <>
      <Avatar sx={{ width: 36, height: 36, flexShrink: 0, bgcolor: "transparent", mt: 0.25 }}>
        <NotifIcon type={type} />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={isRead ? 500 : 700}
          sx={{
            lineHeight: 1.3,
            mb: 0.25,
            // Il titolo è il bersaglio del link: si sottolinea in hover come
            // qualunque altro link del sito.
            ...(url ? { color: "primary.onLight" } : {}),
          }}
        >
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
          {body}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: dateLocale })}
        </Typography>
      </Box>
      {!isRead && (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "primary.main",
            flexShrink: 0,
            mt: 0.75,
          }}
        />
      )}
      {url && (
        <ChevronRightIcon sx={{ fontSize: 20, color: "text.disabled", flexShrink: 0, mt: 0.5 }} />
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
  return (
    <ListItem
      sx={{ alignItems: "flex-start", gap: 1.5, py: 1.5, px: 2, ...(unreadStyles as object) }}
    >
      {content}
    </ListItem>
  );
}
