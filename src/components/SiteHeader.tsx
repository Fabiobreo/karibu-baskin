"use client";
import { useState } from "react";
import {
  AppBar, Toolbar, Box, Button, IconButton,
  Drawer, List, ListItem, ListItemButton,
  ListItemText, Divider, Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const NAV_LINKS = [
  { label: "Allenamenti", href: "/" },
  { label: "Il Baskin", href: "/il-baskin" },
  { label: "La Squadra", href: "/la-squadra" },
];

export default function SiteHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

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

          <Box sx={{ flex: { xs: 1, md: 0 } }} />

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
      </Drawer>
    </>
  );
}
