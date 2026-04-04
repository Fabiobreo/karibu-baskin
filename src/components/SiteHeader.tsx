"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppBar, Toolbar, Box, Button, IconButton,
  Drawer, List, ListItem, ListItemButton,
  ListItemText, Divider, Typography, Avatar,
  Menu, MenuItem, ListItemIcon, Skeleton,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { hasRole } from "@/lib/authRoles";
import type { AppRole } from "@prisma/client";
import Image from "next/image";
import NotificationBell from "@/components/notifications/NotificationBell";

const NAV_LINKS: { label: string; href: string; iconOnly?: boolean }[] = [
  { label: "Home", href: "/", iconOnly: true },
  { label: "Allenamenti", href: "/allenamenti" },
  { label: "La Squadra", href: "/la-squadra" },
  { label: "Il Baskin", href: "/il-baskin" },
  { label: "Sponsor", href: "/sponsor" },
  { label: "Contatti", href: "/contatti" },
];

export default function SiteHeader() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const pathnameRaw = usePathname();
  const pathname = mounted ? pathnameRaw : null;

  const { data: session, status } = useSession();

  const user = session?.user;
  const effectiveRole = user?.appRole as AppRole | undefined;
  const isStaff = status === "authenticated" && !!effectiveRole && hasRole(effectiveRole, "COACH");
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <AppBar position="sticky" color="secondary" elevation={0} sx={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 60 } }}>
          {/* Logo + nome */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <Image src="/logo.png" alt="Karibu Baskin" width={38} height={38} style={{ objectFit: "contain" }} />
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#fff", lineHeight: 1.1, fontSize: "0.9rem" }}>
                Karibu Baskin
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.62rem", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Montecchio Maggiore
              </Typography>
            </Box>
          </Link>

          {/* Nav desktop */}
          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0.5, ml: 3, flex: 1 }}>
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  size="small"
                  sx={{
                    color: active ? "#fff" : "rgba(255,255,255,0.6)",
                    fontWeight: active ? 700 : 500,
                    fontSize: "0.85rem",
                    borderBottom: active ? "2px solid #E65100" : "2px solid transparent",
                    borderRadius: 0,
                    pb: "2px",
                    minWidth: link.iconOnly ? 36 : undefined,
                    px: link.iconOnly ? 1 : undefined,
                    "&:hover": { color: "#fff", backgroundColor: "transparent" },
                  }}
                >
                  {link.iconOnly ? <HomeIcon fontSize="small" /> : link.label}
                </Button>
              );
            })}
          </Box>

          {/* Link Admin (solo COACH/ADMIN) */}
          {status !== "loading" && isStaff && (
            <Button
              onClick={() => router.push("/admin")}
              size="small"
              sx={{
                display: { xs: "none", md: "inline-flex" },
                color: "primary.light",
                fontWeight: 700,
                fontSize: "0.8rem",
                border: "1px solid rgba(230,81,0,0.4)",
                borderRadius: 1,
                px: 1.5,
                ml: 1,
                "&:hover": { backgroundColor: "rgba(230,81,0,0.12)", borderColor: "primary.main" },
              }}
            >
              Admin
            </Button>
          )}

          <Box sx={{ flex: { xs: 1, md: 0 } }} />

          {/* Campanellino notifiche (desktop) */}
          <Box sx={{ display: { xs: "none", md: "flex" } }}>
            <NotificationBell />
          </Box>

          {/* Avatar utente loggato (desktop) */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
            {status === "loading" ? (
              <Skeleton variant="circular" width={34} height={34} sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
            ) : user ? (
              <>
                <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                  <Avatar
                    src={user.image ?? undefined}
                    alt={user.name ?? "Utente"}
                    sx={{ width: 34, height: 34, fontSize: "0.8rem", bgcolor: "primary.main", cursor: "pointer" }}
                  >
                    {!user.image && initials}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                  PaperProps={{ sx: { mt: 1, minWidth: 180 } }}
                >
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{user.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{user.email}</Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={() => { setMenuAnchor(null); router.push("/profilo"); }}>
                    <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
                    Il mio profilo
                  </MenuItem>
                  <MenuItem onClick={() => { setMenuAnchor(null); signOut({ callbackUrl: "/" }); }} sx={{ color: "error.main" }}>
                    <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: "error.main" }} /></ListItemIcon>
                    Esci
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                onClick={() => router.push("/login")}
                size="small"
                variant="outlined"
                sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)", fontSize: "0.8rem", "&:hover": { borderColor: "#fff" } }}
              >
                Accedi
              </Button>
            )}
          </Box>

          {/* Hamburger mobile */}
          <IconButton
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer mobile — solo pagine secondarie */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 240, background: "#1A1A1A", color: "#fff", display: "flex", flexDirection: "column", height: "100%" } }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: "rgba(255,255,255,0.5)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.08em" }}>
            Esplora
          </Typography>
          <IconButton color="inherit" onClick={() => setDrawerOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Pagine secondarie (escluse quelle già nel bottom nav) */}
        <List disablePadding sx={{ flex: 1 }}>
          {[
            { label: "La Squadra", href: "/la-squadra" },
            { label: "Il Baskin", href: "/il-baskin" },
            { label: "Sponsor", href: "/sponsor" },
            { label: "Contatti", href: "/contatti" },
          ].map((link) => {
            const active = pathname === link.href;
            return (
              <ListItem key={link.href} disablePadding>
                <ListItemButton
                  onClick={() => { setDrawerOpen(false); router.push(link.href); }}
                  sx={{
                    py: 1.25,
                    color: active ? "#E65100" : "rgba(255,255,255,0.8)",
                    borderLeft: active ? "3px solid #E65100" : "3px solid transparent",
                  }}
                >
                  <ListItemText primary={link.label} primaryTypographyProps={{ fontWeight: active ? 700 : 400, fontSize: "0.95rem" }} />
                </ListItemButton>
              </ListItem>
            );
          })}

          {/* Admin */}
          {isStaff && (
            <>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", my: 0.5 }} />
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => { setDrawerOpen(false); router.push("/admin"); }}
                  sx={{ py: 1.25, color: "#E65100", borderLeft: "3px solid #E65100" }}
                >
                  <ListItemText primary="Admin" primaryTypographyProps={{ fontWeight: 700, fontSize: "0.95rem" }} />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>

        {/* Esci — in fondo, solo se loggato */}
        {user && (
          <Box>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
            <ListItemButton
              onClick={() => { setDrawerOpen(false); signOut({ callbackUrl: "/" }); }}
              sx={{ py: 1.25, color: "#ef5350" }}
            >
              <ListItemIcon sx={{ minWidth: 34 }}><LogoutIcon fontSize="small" sx={{ color: "#ef5350" }} /></ListItemIcon>
              <ListItemText primary="Esci" primaryTypographyProps={{ fontSize: "0.95rem" }} />
            </ListItemButton>
          </Box>
        )}
      </Drawer>
    </>
  );
}
