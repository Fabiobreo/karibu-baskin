"use client";
import { useState } from "react";
import { Badge, IconButton, Popover } from "@mui/material";
import { useHasMounted } from "@/lib/useHasMounted";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useSession } from "next-auth/react";
import { useNotifications } from "@/context/NotificationContext";
import { useTranslations } from "next-intl";
import NotificationDropdown from "./NotificationDropdown";
import { TOUCH_TARGET } from "@/lib/touchTarget";
import { RADIUS } from "@/lib/radius";
import { heroText } from "@/lib/heroStyles";

interface NotificationBellProps {
  /**
   * Su che fondo sta: `dark` (default) è l'header del sito, `surface` una
   * barra del colore della carta, come quella dell'admin.
   */
  tone?: "dark" | "surface";
}

export default function NotificationBell({ tone = "dark" }: NotificationBellProps) {
  const t = useTranslations("nav");
  const { status } = useSession();
  const { unreadCount } = useNotifications();
  const mounted = useHasMounted();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  if (status !== "authenticated") return null;

  const visibleCount = mounted ? unreadCount : 0;

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={t("notifications")}
        sx={{
          ...TOUCH_TARGET,
          color: tone === "dark" ? heroText.secondary : "text.secondary",
          "&:hover": { color: tone === "dark" ? "common.white" : "text.primary" },
        }}
      >
        <Badge
          badgeContent={visibleCount > 0 ? visibleCount : undefined}
          // Contatore su un elemento che si tocca: arancio, non rosso (UX-29).
          color="primary"
          // Il riempimento che regge l'etichetta bianca (4,71:1).
          sx={{ "& .MuiBadge-badge": { bgcolor: "primary.fill" } }}
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
        PaperProps={{ elevation: 4, sx: { mt: 1, borderRadius: RADIUS.lg } }}
      >
        <NotificationDropdown onClose={() => setAnchorEl(null)} />
      </Popover>
    </>
  );
}
