"use client";
import { Avatar, Box, ListItemButton, Typography } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

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
  if (type === "LINK_REQUEST" || type === "LINK_RESPONSE") return <FamilyRestroomIcon fontSize="small" color="secondary" />;
  return <NotificationsIcon fontSize="small" color="action" />;
}

export default function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const router = useRouter();
  const { id, type, title, body, url, createdAt, isRead } = notification;

  function handleClick() {
    if (!isRead) {
      fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
      onRead(id);
    }
    if (url) router.push(url);
  }

  return (
    <ListItemButton
      onClick={handleClick}
      sx={{
        alignItems: "flex-start",
        gap: 1.5,
        py: 1.5,
        px: 2,
        ...(isRead
          ? {}
          : {
              bgcolor: "rgba(230,81,0,0.08)",
              borderLeft: "3px solid",
              borderColor: "primary.main",
            }),
      }}
    >
      <Avatar sx={{ width: 36, height: 36, flexShrink: 0, bgcolor: "transparent", mt: 0.25 }}>
        <NotifIcon type={type} />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={isRead ? 400 : 700}
          sx={{ lineHeight: 1.3, mb: 0.25 }}
        >
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
          {body}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: it })}
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
    </ListItemButton>
  );
}
