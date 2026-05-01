"use client";
import { useHasMounted } from "@/lib/useHasMounted";
import { usePathname, useRouter } from "next/navigation";
import {
  BottomNavigation, BottomNavigationAction, Badge, Avatar, Box, Paper,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NotificationsIcon from "@mui/icons-material/NotificationsNone";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useSession } from "next-auth/react";
import { useNotifications } from "@/context/NotificationContext";

export default function BottomNav() {
  const router = useRouter();
  const pathnameRaw = usePathname();
  const { data: session, status } = useSession();
  const { unreadCount } = useNotifications();
  const mounted = useHasMounted();

  // Calcola la voce attiva in base al pathname
  const pathname = mounted ? pathnameRaw : "/";
  let active: string;
  if (pathname === "/") active = "/";
  else if (pathname.startsWith("/allenament")) active = "/allenamenti";
  else if (pathname.startsWith("/calendario")) active = "/calendario";
  else if (pathname.startsWith("/notifiche")) active = "/notifiche";
  else if (pathname.startsWith("/profilo") || pathname.startsWith("/login")) active = "/profilo";
  else active = "";

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const visibleCount = mounted ? unreadCount : 0;

  return (
    <Paper
      elevation={8}
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <BottomNavigation
        value={active}
        onChange={(_e, val: string) => router.push(val)}
        sx={{
          background: "#1A1A1A",
          height: 60,
          "& .MuiBottomNavigationAction-root": {
            color: "rgba(255,255,255,0.45)",
            minWidth: 0,
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.65rem",
              mt: "2px",
            },
          },
          "& .Mui-selected": {
            color: "#E65100 !important",
          },
        }}
      >
        <BottomNavigationAction
          label="Home"
          value="/"
          icon={<HomeIcon fontSize="small" />}
        />
        <BottomNavigationAction
          label="Allenamenti"
          value="/allenamenti"
          icon={<SportsBasketballIcon fontSize="small" />}
        />
        <BottomNavigationAction
          label="Calendario"
          value="/calendario"
          icon={<CalendarMonthIcon fontSize="small" />}
        />
        {status === "authenticated" && (
          <BottomNavigationAction
            label="Notifiche"
            value="/notifiche"
            icon={
              <Badge
                badgeContent={visibleCount}
                color="error"
                max={99}
                invisible={visibleCount === 0}
              >
                <NotificationsIcon fontSize="small" />
              </Badge>
            }
          />
        )}
        <BottomNavigationAction
          label={status === "authenticated" ? (user?.name?.split(" ")[0] ?? "Profilo") : "Accedi"}
          value="/profilo"
          onClick={() => {
            if (status === "unauthenticated") router.push("/login");
          }}
          icon={
            status === "authenticated" && user ? (
              <Avatar
                src={user.image ?? undefined}
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: "0.65rem",
                  bgcolor: active === "/profilo" ? "#E65100" : "rgba(255,255,255,0.2)",
                }}
              >
                {!user.image && initials}
              </Avatar>
            ) : (
              <AccountCircleIcon fontSize="small" />
            )
          }
        />
      </BottomNavigation>

      {/* Safe area per iPhone (home indicator) */}
      <Box sx={{ height: "env(safe-area-inset-bottom, 0px)", background: "#1A1A1A" }} />
    </Paper>
  );
}
