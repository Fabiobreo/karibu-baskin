"use client";
import { useState } from "react";
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
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { hasRole } from "@/lib/authRoles";
import type { AppRole } from "@prisma/client";
import Image from "next/image";

const NAV_LINKS = [
  { label: "Allenamenti", href: "/" },
  { label: "La Squadra", href: "/la-squadra" },
  { label: "Il Baskin", href: "/il-baskin" },
  { label: "Sponsor", href: "/sponsor" },
  { label: "Contatti", href: "/contatti" },
];

export default function SiteHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const user = session?.user;
  const isStaff =
    !!user?.appRole && hasRole(user.appRole as AppRole, "COACH");
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

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
                  component={Link}
                  href={link.href}
                  size="small"
                  sx={{
                    color: active ? "#fff" : "rgba(255,255,255,0.6)",
                    fontWeight: active ? 700 : 500,
                    fontSize: "0.85rem",
                    borderBottom: active ? "2px solid #E65100" : "2px solid transparent",
                    borderRadius: 0,
                    pb: "2px",
                    "&:hover": { color: "#fff", backgroundColor: "transparent" },
                  }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Box>

          {/* Link Admin (solo COACH/ADMIN) */}
          {isStaff && (
            <Button
              component={Link}
              href="/admin"
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
                  <MenuItem component={Link} href="/profilo" onClick={() => setMenuAnchor(null)}>
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
                component={Link}
                href="/login"
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

      {/* Drawer mobile */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 240, background: "#1A1A1A", color: "#fff" } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>Menu</Typography>
          <IconButton color="inherit" onClick={() => setDrawerOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

        {/* Utente nel drawer */}
        {user ? (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5 }}>
              <Avatar
                src={user.image ?? undefined}
                alt={user.name ?? "Utente"}
                sx={{ width: 36, height: 36, fontSize: "0.8rem", bgcolor: "primary.main" }}
              >
                {!user.image && initials}
              </Avatar>
              <Box sx={{ overflow: "hidden" }}>
                <Typography variant="body2" fontWeight={700} noWrap>{user.name}</Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }} noWrap>{user.email}</Typography>
              </Box>
            </Box>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
          </>
        ) : (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Button
              component={Link}
              href="/login"
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => setDrawerOpen(false)}
              sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
            >
              Accedi con Google
            </Button>
          </Box>
        )}

        <List>
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <ListItem key={link.href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    color: active ? "#E65100" : "rgba(255,255,255,0.85)",
                    fontWeight: active ? 700 : 400,
                    borderLeft: active ? "3px solid #E65100" : "3px solid transparent",
                  }}
                >
                  <ListItemText primary={link.label} primaryTypographyProps={{ fontWeight: active ? 700 : 400 }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {isStaff && (
          <>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                href="/admin"
                onClick={() => setDrawerOpen(false)}
                sx={{ color: "#E65100", fontWeight: 700, borderLeft: "3px solid #E65100" }}
              >
                <ListItemText primary="Admin" />
              </ListItemButton>
            </ListItem>
          </>
        )}

        {user && (
          <>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mt: "auto" }} />
            <ListItemButton
              onClick={() => { setDrawerOpen(false); signOut({ callbackUrl: "/" }); }}
              sx={{ color: "#ef5350", py: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}><LogoutIcon fontSize="small" sx={{ color: "#ef5350" }} /></ListItemIcon>
              <ListItemText primary="Esci" />
            </ListItemButton>
          </>
        )}
      </Drawer>
    </>
  );
}
