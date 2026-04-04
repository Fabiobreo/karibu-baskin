"use client";
import { useEffect, useState } from "react";
import { Badge, IconButton, Popover } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useSession } from "next-auth/react";
import { useNotifications } from "@/context/NotificationContext";
import NotificationDropdown from "./NotificationDropdown";

export default function NotificationBell() {
  const { status } = useSession();
  const { unreadCount } = useNotifications();
  const [mounted, setMounted] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  if (status !== "authenticated") return null;

  const visibleCount = mounted ? unreadCount : 0;

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ color: "rgba(255,255,255,0.85)", "&:hover": { color: "#fff" } }}
        size="small"
      >
        <Badge
          badgeContent={visibleCount}
          color="error"
          max={99}
          invisible={visibleCount === 0}
        >
          {visibleCount > 0 ? (
            <NotificationsIcon fontSize="small" />
          ) : (
            <NotificationsNoneIcon fontSize="small" />
          )}
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ elevation: 4, sx: { mt: 1, borderRadius: 2 } }}
      >
        <NotificationDropdown onClose={() => setAnchorEl(null)} />
      </Popover>
    </>
  );
}
