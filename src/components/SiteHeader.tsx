"use client";
import { useState } from "react";
import { useHasMounted } from "@/lib/useHasMounted";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Skeleton,
  Collapse,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { hasRole } from "@/lib/authRoles";
import type { AppRole } from "@prisma/client";
import Image from "next/image";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useThemeMode } from "@/context/ThemeContext";
import Tooltip from "@mui/material/Tooltip";
import { alpha } from "@mui/material/styles";
import useSWR from "swr";
import { getCurrentSeason } from "@/lib/seasonUtils";
import { slugify } from "@/lib/slugUtils";

// Voci semplici del nav (solo quelle che non hanno dropdown)
const NAV_LINKS: { label: string; href: string; iconOnly?: boolean }[] = [
  { label: "Home", href: "/", iconOnly: true },
  { label: "Allenamenti", href: "/allenamenti" },
  { label: "Calendario", href: "/calendario" },
];

// Voci dropdown "Partite"
const PARTITE_LINKS = [
  { label: "Prossime partite", href: "/partite" },
  { label: "Risultati", href: "/risultati" },
  { label: "Classifiche", href: "/classifiche" },
  { label: "Marcatori", href: "/marcatori" },
];

// Voci dropdown "Il Baskin"
const IL_BASKIN_LINKS: { label: string; href: string; disabled?: boolean; badge?: string }[] = [
  { label: "Cos'è il Baskin", href: "/il-baskin" },
  { label: "News", href: "/news" },
  { label: "Gallery", href: "/gallery", disabled: true, badge: "Soon" },
];

// Voci dropdown "Contatti"
const CONTATTI_LINKS = [
  { label: "Contatti", href: "/contatti" },
  { label: "FAQ", href: "/faq" },
];

// Voce fissa dropdown Squadre
const SQUADRE_BASE_LINK = { label: "Chi siamo", href: "/squadre" };

const COLOR_MODE_ORDER = ["light", "dark", "system"] as const;
type ColorMode = (typeof COLOR_MODE_ORDER)[number];

const MODE_LABELS: Record<ColorMode, string> = {
  light: "Tema chiaro",
  dark: "Tema scuro",
  system: "Segui sistema",
};

function ThemeModeIcon({ mode }: { mode: ColorMode }) {
  if (mode === "light") return <LightModeIcon fontSize="small" />;
  if (mode === "dark") return <DarkModeIcon fontSize="small" />;
  return <SettingsBrightnessIcon fontSize="small" />;
}

export default function SiteHeader() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [partiteAnchor, setPartiteAnchor] = useState<null | HTMLElement>(null);
  const [partiteOpen, setPartiteOpen] = useState(false);
  const [squadreAnchor, setSquadreAnchor] = useState<null | HTMLElement>(null);
  const [squadreOpen, setSquadreOpen] = useState(false);
  const [ilBaskinAnchor, setIlBaskinAnchor] = useState<null | HTMLElement>(null);
  const [ilBaskinOpen, setIlBaskinOpen] = useState(false);
  const [contattiAnchor, setContattiAnchor] = useState<null | HTMLElement>(null);
  const [contattiOpen, setContattiOpen] = useState(false);
  const mounted = useHasMounted();
  const { mode: colorMode, setMode: setColorMode } = useThemeMode();

  function cycleColorMode() {
    const idx = COLOR_MODE_ORDER.indexOf(colorMode as ColorMode);
    setColorMode(COLOR_MODE_ORDER[(idx + 1) % COLOR_MODE_ORDER.length]);
  }
  const pathnameRaw = usePathname();
  const pathname = mounted ? pathnameRaw : null;
  const partiteActive =
    pathname === "/risultati" ||
    pathname === "/classifiche" ||
    pathname === "/marcatori" ||
    (pathname?.startsWith("/partite") ?? false) ||
    (pathname?.startsWith("/gironi") ?? false);
  const squadreActive = pathname?.startsWith("/squadre") ?? false;
  const ilBaskinActive =
    pathname === "/il-baskin" ||
    (pathname?.startsWith("/news") ?? false) ||
    pathname === "/gallery";
  const contattiActive = pathname === "/contatti" || pathname === "/faq";

  // Squadre della stagione corrente per i link dinamici del dropdown
  const { data: allTeams } = useSWR<{ id: string; name: string; season: string }[]>(
    "/api/competitive-teams",
    (url: string) => fetch(url).then((r) => r.json())
  );
  const currentSeason = getCurrentSeason();
  const currentTeams = (allTeams ?? []).filter((t) => t.season === currentSeason);
  const squadreLinks = [
    SQUADRE_BASE_LINK,
    ...currentTeams.map((t) => ({
      label: t.name,
      href: `/squadre/${currentSeason.replace("-", "")}/${slugify(t.name)}`,
    })),
    { label: "Archivio", href: "/squadre/archivio" },
  ];

  const { data: session, status } = useSession();

  const user = session?.user;
  const effectiveRole = user?.appRole as AppRole | undefined;
  const isStaff = status === "authenticated" && !!effectiveRole && hasRole(effectiveRole, "COACH");
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  return (
    <>
      <AppBar
        position="sticky"
        color="secondary"
        elevation={0}
        sx={{
          borderBottom: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
          boxShadow: "0 2px 16px rgba(0,0,0,0.6)",
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 60 } }}>
          {/* Logo + nome */}
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <Image
              src="/logo.png"
              alt="Karibu Baskin"
              width={38}
              height={38}
              style={{ objectFit: "contain" }}
            />
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography
                variant="subtitle2"
                fontWeight={800}
                sx={{ color: "common.white", lineHeight: 1.1, fontSize: "0.9rem" }}
              >
                Karibu Baskin
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: (theme) => alpha(theme.palette.common.white, 0.5),
                  fontSize: "0.62rem",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}
              >
                Montecchio Maggiore
              </Typography>
            </Box>
          </Link>

          {/* Nav desktop */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              gap: 0.5,
              ml: 3,
              flex: 1,
              alignItems: "center",
            }}
          >
            {/* Voci semplici: Home, Allenamenti, Calendario */}
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Button
                  key={link.href}
                  component={Link}
                  href={link.href}
                  size="small"
                  sx={{
                    color: active
                      ? "common.white"
                      : (theme) => alpha(theme.palette.common.white, 0.6),
                    fontWeight: active ? 700 : 500,
                    fontSize: "0.85rem",
                    borderBottom: active ? "2px solid" : "2px solid transparent",
                    borderBottomColor: active ? "primary.main" : "transparent",
                    borderRadius: 0,
                    pb: "2px",
                    minWidth: link.iconOnly ? 36 : undefined,
                    px: link.iconOnly ? 1 : undefined,
                    "&:hover": { color: "common.white", backgroundColor: "transparent" },
                  }}
                >
                  {link.iconOnly ? <HomeIcon fontSize="small" /> : link.label}
                </Button>
              );
            })}

            {/* Dropdown Partite */}
            <Button
              size="small"
              onClick={(e) => setPartiteAnchor(e.currentTarget)}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: "0.9rem !important", ml: -0.5 }} />}
              sx={{
                color: partiteActive
                  ? "common.white"
                  : (theme) => alpha(theme.palette.common.white, 0.6),
                fontWeight: partiteActive ? 700 : 500,
                fontSize: "0.85rem",
                borderBottom: partiteActive ? "2px solid" : "2px solid transparent",
                borderBottomColor: partiteActive ? "primary.main" : "transparent",
                borderRadius: 0,
                pb: "2px",
                "&:hover": { color: "common.white", backgroundColor: "transparent" },
              }}
            >
              Partite
            </Button>
            <Menu
              anchorEl={partiteAnchor}
              open={Boolean(partiteAnchor)}
              onClose={() => setPartiteAnchor(null)}
              transformOrigin={{ horizontal: "left", vertical: "top" }}
              anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
              PaperProps={{ sx: { mt: 0.5, minWidth: 150 } }}
            >
              {PARTITE_LINKS.map((pl) => (
                <MenuItem
                  key={pl.href}
                  component={Link}
                  href={pl.href}
                  selected={pathname === pl.href}
                  onClick={() => setPartiteAnchor(null)}
                  sx={{ fontSize: "0.9rem", fontWeight: pathname === pl.href ? 700 : 400 }}
                >
                  {pl.label}
                </MenuItem>
              ))}
            </Menu>

            {/* Dropdown Squadre */}
            <Button
              size="small"
              onClick={(e) => setSquadreAnchor(e.currentTarget)}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: "0.9rem !important", ml: -0.5 }} />}
              sx={{
                color: squadreActive
                  ? "common.white"
                  : (theme) => alpha(theme.palette.common.white, 0.6),
                fontWeight: squadreActive ? 700 : 500,
                fontSize: "0.85rem",
                borderBottom: squadreActive ? "2px solid" : "2px solid transparent",
                borderBottomColor: squadreActive ? "primary.main" : "transparent",
                borderRadius: 0,
                pb: "2px",
                "&:hover": { color: "common.white", backgroundColor: "transparent" },
              }}
            >
              Squadre
            </Button>
            <Menu
              anchorEl={squadreAnchor}
              open={Boolean(squadreAnchor)}
              onClose={() => setSquadreAnchor(null)}
              transformOrigin={{ horizontal: "left", vertical: "top" }}
              anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
              PaperProps={{ sx: { mt: 0.5, minWidth: 160 } }}
            >
              {squadreLinks.map((sl) => (
                <MenuItem
                  key={sl.href}
                  component={Link}
                  href={sl.href}
                  selected={pathname === sl.href}
                  onClick={() => setSquadreAnchor(null)}
                  sx={{ fontSize: "0.9rem", fontWeight: pathname === sl.href ? 700 : 400 }}
                >
                  {sl.label}
                </MenuItem>
              ))}
            </Menu>

            {/* Dropdown Il Baskin */}
            <Button
              size="small"
              onClick={(e) => setIlBaskinAnchor(e.currentTarget)}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: "0.9rem !important", ml: -0.5 }} />}
              sx={{
                color: ilBaskinActive
                  ? "common.white"
                  : (theme) => alpha(theme.palette.common.white, 0.6),
                fontWeight: ilBaskinActive ? 700 : 500,
                fontSize: "0.85rem",
                borderBottom: ilBaskinActive ? "2px solid" : "2px solid transparent",
                borderBottomColor: ilBaskinActive ? "primary.main" : "transparent",
                borderRadius: 0,
                pb: "2px",
                "&:hover": { color: "common.white", backgroundColor: "transparent" },
              }}
            >
              Il Baskin
            </Button>
            <Menu
              anchorEl={ilBaskinAnchor}
              open={Boolean(ilBaskinAnchor)}
              onClose={() => setIlBaskinAnchor(null)}
              transformOrigin={{ horizontal: "left", vertical: "top" }}
              anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
              PaperProps={{ sx: { mt: 0.5, minWidth: 170 } }}
            >
              {IL_BASKIN_LINKS.map((bl) => (
                <MenuItem
                  key={bl.href}
                  component={bl.disabled ? "li" : Link}
                  href={bl.disabled ? undefined : bl.href}
                  selected={pathname === bl.href}
                  disabled={bl.disabled}
                  onClick={() => !bl.disabled && setIlBaskinAnchor(null)}
                  sx={{ fontSize: "0.9rem", fontWeight: pathname === bl.href ? 700 : 400, gap: 1 }}
                >
                  {bl.label}
                  {bl.badge && (
                    <Box
                      component="span"
                      sx={{
                        ml: "auto",
                        fontSize: "0.65rem",
                        px: 0.6,
                        py: 0.1,
                        borderRadius: 0.5,
                        bgcolor: "action.selected",
                        color: "text.secondary",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {bl.badge}
                    </Box>
                  )}
                </MenuItem>
              ))}
            </Menu>

            {/* Dropdown Contatti */}
            <Button
              size="small"
              onClick={(e) => setContattiAnchor(e.currentTarget)}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: "0.9rem !important", ml: -0.5 }} />}
              sx={{
                color: contattiActive
                  ? "common.white"
                  : (theme) => alpha(theme.palette.common.white, 0.6),
                fontWeight: contattiActive ? 700 : 500,
                fontSize: "0.85rem",
                borderBottom: contattiActive ? "2px solid" : "2px solid transparent",
                borderBottomColor: contattiActive ? "primary.main" : "transparent",
                borderRadius: 0,
                pb: "2px",
                "&:hover": { color: "common.white", backgroundColor: "transparent" },
              }}
            >
              Contatti
            </Button>
            <Menu
              anchorEl={contattiAnchor}
              open={Boolean(contattiAnchor)}
              onClose={() => setContattiAnchor(null)}
              transformOrigin={{ horizontal: "left", vertical: "top" }}
              anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
              PaperProps={{ sx: { mt: 0.5, minWidth: 140 } }}
            >
              {CONTATTI_LINKS.map((cl) => (
                <MenuItem
                  key={cl.href}
                  component={Link}
                  href={cl.href}
                  selected={pathname === cl.href}
                  onClick={() => setContattiAnchor(null)}
                  sx={{ fontSize: "0.9rem", fontWeight: pathname === cl.href ? 700 : 400 }}
                >
                  {cl.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Link Admin (solo COACH/ADMIN) */}
          {status !== "loading" && isStaff && (
            <Button
              component={Link}
              href="/admin"
              size="small"
              sx={{
                display: { xs: "none", md: "inline-flex" },
                color: "primary.light",
                fontWeight: 700,
                fontSize: "0.8rem",
                border: "1px solid",
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.4),
                borderRadius: 1,
                px: 1.5,
                ml: 1,
                "&:hover": {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  borderColor: "primary.main",
                },
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
              <Skeleton
                variant="circular"
                width={34}
                height={34}
                sx={{ bgcolor: (theme) => alpha(theme.palette.common.white, 0.1) }}
              />
            ) : user ? (
              <>
                <IconButton
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  aria-label="Menu utente"
                  sx={{ p: 0.5 }}
                >
                  <Avatar
                    src={user.customImage ?? user.image ?? undefined}
                    alt={user.name ?? "Utente"}
                    sx={{
                      width: 34,
                      height: 34,
                      fontSize: "0.8rem",
                      bgcolor: "primary.main",
                      cursor: "pointer",
                    }}
                  >
                    {!(user.customImage ?? user.image) && initials}
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
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {user.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      router.push("/profilo");
                    }}
                  >
                    <ListItemIcon>
                      <AccountCircleIcon fontSize="small" />
                    </ListItemIcon>
                    Il mio profilo
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      router.push("/profilo/disponibilita");
                    }}
                  >
                    <ListItemIcon>
                      <EventAvailableIcon fontSize="small" />
                    </ListItemIcon>
                    Le mie disponibilità
                  </MenuItem>
                  <MenuItem onClick={cycleColorMode}>
                    <ListItemIcon>
                      <ThemeModeIcon mode={colorMode as ColorMode} />
                    </ListItemIcon>
                    {MODE_LABELS[colorMode as ColorMode]}
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      signOut({ callbackUrl: "/" });
                    }}
                    sx={{ color: "error.main" }}
                  >
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
                    </ListItemIcon>
                    Esci
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                onClick={() => router.push("/login")}
                size="small"
                variant="outlined"
                sx={{
                  color: "common.white",
                  borderColor: (theme) => alpha(theme.palette.common.white, 0.3),
                  fontSize: "0.8rem",
                  "&:hover": { borderColor: "common.white" },
                }}
              >
                Accedi
              </Button>
            )}
          </Box>

          {/* Hamburger mobile */}
          <IconButton
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            aria-label="Apri menu di navigazione"
            sx={{ display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer mobile — solo pagine secondarie */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 240,
            background: "#1A1A1A",
            color: "common.white",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{
              color: (theme) => alpha(theme.palette.common.white, 0.5),
              textTransform: "uppercase",
              fontSize: "0.7rem",
              letterSpacing: "0.08em",
            }}
          >
            Esplora
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => setDrawerOpen(false)}
            size="small"
            aria-label="Chiudi menu"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: (theme) => alpha(theme.palette.common.white, 0.08) }} />

        {/* Nav mobile */}
        <List disablePadding sx={{ flex: 1 }}>
          {/* Voci semplici prima di "Partite" */}
          {[
            { label: "Allenamenti", href: "/allenamenti" },
            { label: "Calendario", href: "/calendario" },
          ].map((link) => {
            const active = pathname === link.href;
            return (
              <ListItem key={link.href} disablePadding>
                <ListItemButton
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push(link.href);
                  }}
                  sx={{
                    py: 1.25,
                    color: active
                      ? "primary.main"
                      : (theme) => alpha(theme.palette.common.white, 0.8),
                    borderLeft: active ? "3px solid" : "3px solid transparent",
                    borderLeftColor: active ? "primary.main" : "transparent",
                  }}
                >
                  <ListItemText
                    primary={link.label}
                    primaryTypographyProps={{ fontWeight: active ? 700 : 400, fontSize: "0.95rem" }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}

          {/* Partite — voce padre espandibile */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setPartiteOpen((o) => !o)}
              sx={{
                py: 1.25,
                color: partiteActive
                  ? "primary.main"
                  : (theme) => alpha(theme.palette.common.white, 0.8),
                borderLeft: partiteActive ? "3px solid" : "3px solid transparent",
                borderLeftColor: partiteActive ? "primary.main" : "transparent",
              }}
            >
              <ListItemText
                primary="Partite"
                primaryTypographyProps={{
                  fontWeight: partiteActive ? 700 : 400,
                  fontSize: "0.95rem",
                }}
              />
              {partiteOpen ? (
                <ExpandLessIcon
                  sx={{ fontSize: 18, color: (theme) => alpha(theme.palette.common.white, 0.4) }}
                />
              ) : (
                <ExpandMoreIcon
                  sx={{ fontSize: 18, color: (theme) => alpha(theme.palette.common.white, 0.4) }}
                />
              )}
            </ListItemButton>
          </ListItem>

          {/* Voci figlio: Risultati + Classifiche */}
          <Collapse in={partiteOpen} timeout="auto" unmountOnExit>
            <List disablePadding>
              {PARTITE_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <ListItem key={link.href} disablePadding>
                    <ListItemButton
                      onClick={() => {
                        setDrawerOpen(false);
                        router.push(link.href);
                      }}
                      sx={{
                        py: 1,
                        pl: 4,
                        color: active
                          ? "primary.main"
                          : (theme) => alpha(theme.palette.common.white, 0.55),
                        borderLeft: active ? "3px solid" : "3px solid transparent",
                        borderLeftColor: active ? "primary.main" : "transparent",
                      }}
                    >
                      <ListItemText
                        primary={link.label}
                        primaryTypographyProps={{
                          fontWeight: active ? 700 : 400,
                          fontSize: "0.88rem",
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Collapse>

          {/* Squadre — voce padre espandibile */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setSquadreOpen((o) => !o)}
              sx={{
                py: 1.25,
                color: squadreActive
                  ? "primary.main"
                  : (theme) => alpha(theme.palette.common.white, 0.8),
                borderLeft: squadreActive ? "3px solid" : "3px solid transparent",
                borderLeftColor: squadreActive ? "primary.main" : "transparent",
              }}
            >
              <ListItemText
                primary="Squadre"
                primaryTypographyProps={{
                  fontWeight: squadreActive ? 700 : 400,
                  fontSize: "0.95rem",
                }}
              />
              {squadreOpen ? (
                <ExpandLessIcon
                  sx={{ fontSize: 18, color: (theme) => alpha(theme.palette.common.white, 0.4) }}
                />
              ) : (
                <ExpandMoreIcon
                  sx={{ fontSize: 18, color: (theme) => alpha(theme.palette.common.white, 0.4) }}
                />
              )}
            </ListItemButton>
          </ListItem>

          <Collapse in={squadreOpen} timeout="auto" unmountOnExit>
            <List disablePadding>
              {squadreLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <ListItem key={link.href} disablePadding>
                    <ListItemButton
                      onClick={() => {
                        setDrawerOpen(false);
                        router.push(link.href);
                      }}
                      sx={{
                        py: 1,
                        pl: 4,
                        color: active
                          ? "primary.main"
                          : (theme) => alpha(theme.palette.common.white, 0.55),
                        borderLeft: active ? "3px solid" : "3px solid transparent",
                        borderLeftColor: active ? "primary.main" : "transparent",
                      }}
                    >
                      <ListItemText
                        primary={link.label}
                        primaryTypographyProps={{
                          fontWeight: active ? 700 : 400,
                          fontSize: "0.88rem",
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Collapse>

          {/* Il Baskin — voce padre espandibile */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setIlBaskinOpen((o) => !o)}
              sx={{
                py: 1.25,
                color: ilBaskinActive
                  ? "primary.main"
                  : (theme) => alpha(theme.palette.common.white, 0.8),
                borderLeft: ilBaskinActive ? "3px solid" : "3px solid transparent",
                borderLeftColor: ilBaskinActive ? "primary.main" : "transparent",
              }}
            >
              <ListItemText
                primary="Il Baskin"
                primaryTypographyProps={{
                  fontWeight: ilBaskinActive ? 700 : 400,
                  fontSize: "0.95rem",
                }}
              />
              {ilBaskinOpen ? (
                <ExpandLessIcon
                  sx={{ fontSize: 18, color: (theme) => alpha(theme.palette.common.white, 0.4) }}
                />
              ) : (
                <ExpandMoreIcon
                  sx={{ fontSize: 18, color: (theme) => alpha(theme.palette.common.white, 0.4) }}
                />
              )}
            </ListItemButton>
          </ListItem>

          <Collapse in={ilBaskinOpen} timeout="auto" unmountOnExit>
            <List disablePadding>
              {IL_BASKIN_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <ListItem key={link.href} disablePadding>
                    <ListItemButton
                      disabled={link.disabled}
                      onClick={() => {
                        if (link.disabled) return;
                        setDrawerOpen(false);
                        router.push(link.href);
                      }}
                      sx={{
                        py: 1,
                        pl: 4,
                        color: active
                          ? "primary.main"
                          : (theme) => alpha(theme.palette.common.white, 0.55),
                        borderLeft: active ? "3px solid" : "3px solid transparent",
                        borderLeftColor: active ? "primary.main" : "transparent",
                      }}
                    >
                      <ListItemText
                        primary={link.label}
                        primaryTypographyProps={{
                          fontWeight: active ? 700 : 400,
                          fontSize: "0.88rem",
                        }}
                      />
                      {link.badge && (
                        <Box
                          component="span"
                          sx={{
                            fontSize: "0.6rem",
                            px: 0.6,
                            py: 0.1,
                            borderRadius: 0.5,
                            bgcolor: (theme) => alpha(theme.palette.common.white, 0.1),
                            color: (theme) => alpha(theme.palette.common.white, 0.4),
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {link.badge}
                        </Box>
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Collapse>

          {/* Contatti — voce padre espandibile */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setContattiOpen((o) => !o)}
              sx={{
                py: 1.25,
                color: contattiActive
                  ? "primary.main"
                  : (theme) => alpha(theme.palette.common.white, 0.8),
                borderLeft: contattiActive ? "3px solid" : "3px solid transparent",
                borderLeftColor: contattiActive ? "primary.main" : "transparent",
              }}
            >
              <ListItemText
                primary="Contatti"
                primaryTypographyProps={{
                  fontWeight: contattiActive ? 700 : 400,
                  fontSize: "0.95rem",
                }}
              />
              {contattiOpen ? (
                <ExpandLessIcon
                  sx={{ fontSize: 18, color: (theme) => alpha(theme.palette.common.white, 0.4) }}
                />
              ) : (
                <ExpandMoreIcon
                  sx={{ fontSize: 18, color: (theme) => alpha(theme.palette.common.white, 0.4) }}
                />
              )}
            </ListItemButton>
          </ListItem>

          <Collapse in={contattiOpen} timeout="auto" unmountOnExit>
            <List disablePadding>
              {CONTATTI_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <ListItem key={link.href} disablePadding>
                    <ListItemButton
                      onClick={() => {
                        setDrawerOpen(false);
                        router.push(link.href);
                      }}
                      sx={{
                        py: 1,
                        pl: 4,
                        color: active
                          ? "primary.main"
                          : (theme) => alpha(theme.palette.common.white, 0.55),
                        borderLeft: active ? "3px solid" : "3px solid transparent",
                        borderLeftColor: active ? "primary.main" : "transparent",
                      }}
                    >
                      <ListItemText
                        primary={link.label}
                        primaryTypographyProps={{
                          fontWeight: active ? 700 : 400,
                          fontSize: "0.88rem",
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Collapse>

          {/* Admin */}
          {isStaff && (
            <>
              <Divider
                sx={{ borderColor: (theme) => alpha(theme.palette.common.white, 0.08), my: 0.5 }}
              />
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push("/admin");
                  }}
                  sx={{
                    py: 1.25,
                    color: "primary.main",
                    borderLeft: "3px solid",
                    borderLeftColor: "primary.main",
                  }}
                >
                  <ListItemText
                    primary="Admin"
                    primaryTypographyProps={{ fontWeight: 700, fontSize: "0.95rem" }}
                  />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>

        {/* Footer drawer: sezione utente */}
        <Box>
          <Divider sx={{ borderColor: (theme) => alpha(theme.palette.common.white, 0.08) }} />
          {user ? (
            <>
              <ListItemButton
                onClick={cycleColorMode}
                sx={{ py: 1.25, color: (theme) => alpha(theme.palette.common.white, 0.7) }}
              >
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <ThemeModeIcon mode={colorMode as ColorMode} />
                </ListItemIcon>
                <ListItemText
                  primary={MODE_LABELS[colorMode as ColorMode]}
                  primaryTypographyProps={{ fontSize: "0.9rem" }}
                />
              </ListItemButton>
              <Divider sx={{ borderColor: (theme) => alpha(theme.palette.common.white, 0.08) }} />
              <ListItemButton
                onClick={() => {
                  setDrawerOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                sx={{ py: 1.25, color: "error.main" }}
              >
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
                </ListItemIcon>
                <ListItemText primary="Esci" primaryTypographyProps={{ fontSize: "0.95rem" }} />
              </ListItemButton>
            </>
          ) : (
            <ListItemButton
              onClick={cycleColorMode}
              sx={{ py: 1.25, color: (theme) => alpha(theme.palette.common.white, 0.7) }}
            >
              <ListItemIcon sx={{ minWidth: 34 }}>
                <ThemeModeIcon mode={colorMode as ColorMode} />
              </ListItemIcon>
              <ListItemText
                primary={MODE_LABELS[colorMode as ColorMode]}
                primaryTypographyProps={{ fontSize: "0.9rem" }}
              />
            </ListItemButton>
          )}
          <Box
            sx={{
              px: 2,
              py: 1,
              borderTop: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
            }}
          >
            <Link
              href="/privacy"
              onClick={() => setDrawerOpen(false)}
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.35)",
                textDecoration: "underline",
                textDecorationColor: "rgba(255,255,255,0.15)",
              }}
            >
              Informativa privacy
            </Link>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
