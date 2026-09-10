"use client";
import { useHasMounted } from "@/lib/useHasMounted";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BottomNavigation, BottomNavigationAction, Badge, Avatar, Box, Paper } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NotificationsIcon from "@mui/icons-material/NotificationsNone";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useSession } from "next-auth/react";
import { useNotifications } from "@/context/NotificationContext";

export default function BottomNav() {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { unreadCount } = useNotifications();
  const mounted = useHasMounted();

  // Calcola la voce attiva in base al pathname (nessun gate sul mount:
  // usePathname e gia risolto lato server, la voce attiva non "salta").
  let active: string;
  if (pathname === "/") active = "/";
  else if (pathname.startsWith("/allenament")) active = "/allenamenti";
  else if (pathname.startsWith("/calendario")) active = "/calendario";
  else if (pathname.startsWith("/notifiche")) active = "/notifiche";
  else if (pathname.startsWith("/profilo") || pathname.startsWith("/login")) active = "/profilo";
  else active = "";

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  const visibleCount = mounted ? unreadCount : 0;

  return (
    <Paper
      component="nav"
      aria-label={t("quickNav")}
      elevation={8}
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <BottomNavigation
        value={active}
        onChange={(_e, val: string) => router.push(val)}
        sx={{
          bgcolor: "background.paper",
          height: 60,
          "& .MuiBottomNavigationAction-root": {
            color: "text.secondary",
            minWidth: 0,
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.65rem",
              mt: "2px",
            },
          },
          "& .Mui-selected": {
            // Etichetta di testo (10px): serve l'arancione accessibile, non
            // `primary.main`, che su fondo chiaro si ferma a 3,79:1.
            // Il valore passa da callback: `sx` non risolve i token di palette
            // quando la stringa porta anche `!important`, e la regola veniva
            // scartata come CSS non valido.
            color: (theme) => `${theme.palette.primary.onLight} !important`,
          },
        }}
      >
        <BottomNavigationAction label={t("home")} value="/" icon={<HomeIcon fontSize="small" />} />
        <BottomNavigationAction
          label={t("trainings")}
          value="/allenamenti"
          icon={<SportsBasketballIcon fontSize="small" />}
        />
        <BottomNavigationAction
          label={t("calendar")}
          value="/calendario"
          icon={<CalendarMonthIcon fontSize="small" />}
        />
        {status === "authenticated" && (
          <BottomNavigationAction
            label={t("notifications")}
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
          label={
            status === "authenticated" ? (user?.name?.split(" ")[0] ?? t("profile")) : t("login")
          }
          value="/profilo"
          onClick={() => {
            if (status === "unauthenticated") router.push("/login");
          }}
          icon={
            status === "authenticated" && user ? (
              <Avatar
                src={user.customImage ?? user.image ?? undefined}
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: "0.65rem",
                  bgcolor: active === "/profilo" ? "primary.main" : "action.selected",
                  color: active === "/profilo" ? "primary.contrastText" : "text.primary",
                }}
              >
                {!(user.customImage ?? user.image) && initials}
              </Avatar>
            ) : (
              <AccountCircleIcon fontSize="small" />
            )
          }
        />
      </BottomNavigation>

      {/* Safe area per iPhone (home indicator) */}
      <Box sx={{ height: "env(safe-area-inset-bottom, 0px)", bgcolor: "background.paper" }} />
    </Paper>
  );
}
