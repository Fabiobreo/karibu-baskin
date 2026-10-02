"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { AppRole } from "@prisma/client";
import {
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ShieldIcon from "@mui/icons-material/Shield";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import CheckIcon from "@mui/icons-material/Check";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import MuiLink from "@mui/material/Link";
import NotificationBell from "@/components/notifications/NotificationBell";
import AdminNavDrawer from "@/components/admin/AdminNavDrawer";
import { useThemeMode } from "@/context/ThemeContext";
import { useHasMounted } from "@/lib/useHasMounted";
import { hasRole } from "@/lib/authRoles";
import { purgeServiceWorkerCaches } from "@/lib/swCachePurge";
import {
  ADMIN_NAV,
  ADMIN_NAV_GROUP_LABELS,
  activeAdminSection,
  type AdminNavGroup,
} from "@/lib/adminNav";
import { TOUCH_TARGET } from "@/lib/touchTarget";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

const BAR_HEIGHT = { xs: 56, sm: 60 } as const;

const THEME_MODES = [
  { mode: "light", label: "Tema chiaro", icon: <LightModeIcon fontSize="small" /> },
  {
    mode: "system",
    label: "Tema del dispositivo",
    icon: <SettingsBrightnessIcon fontSize="small" />,
  },
  { mode: "dark", label: "Tema scuro", icon: <DarkModeIcon fontSize="small" /> },
] as const;

const BAR_ITEMS = ADMIN_NAV.filter((i) => i.inBar);
const MORE_ITEMS = ADMIN_NAV.filter((i) => !i.inBar);
const MORE_GROUPS = (["attivita", "anagrafiche", "strumenti"] as const).filter((g) =>
  MORE_ITEMS.some((i) => i.group === g)
);

/** Voce della barra: testo pieno, la corrente in arancio con il filo sotto. */
function barItemSx(active: boolean) {
  return {
    alignSelf: "stretch",
    minWidth: 0,
    px: 1.5,
    borderRadius: 0,
    whiteSpace: "nowrap",
    borderBottom: "3px solid",
    borderColor: active ? "adminBand.indicator" : "transparent",
    color: active ? "adminBand.accent" : "adminBand.text",
    fontWeight: FONT_WEIGHT.semibold,
    "&:hover": { bgcolor: "adminBand.hover" },
  } as const;
}

/**
 * Intestazione del pannello staff (UX-40): l'unico livello di navigazione in
 * admin. Sostituisce l'header pubblico, la vecchia barra a tab e, su telefono,
 * la barra in basso.
 *
 * Da `lg` le sezioni più usate sono link nella barra e il resto sta sotto
 * "Altro"; sotto `lg` c'è il menu (`AdminNavDrawer`) e la barra dice in quale
 * sezione si è. La campanella c'è a ogni larghezza: su telefono le notifiche
 * stavano solo nella barra in basso, che qui non c'è. Niente ricerca globale
 * (esclude ospiti e minori: allo staff darebbe risultati incompleti) e niente
 * lingua (l'admin è solo in italiano); il tema sta nel menu dell'avatar.
 *
 * Uscire verso il sito costa un tocco a ogni larghezza: il logo porta alla home
 * (da lì, su telefono, c'è la barra in basso), e da `md` c'è anche il bottone
 * "Torna al sito".
 *
 * Chi non è dello staff (la pagina di accesso) vede solo logo e "Torna al sito".
 */
export default function AdminHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const mounted = useHasMounted();
  const { mode, setMode } = useThemeMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const user = session?.user;
  const role = user?.appRole as AppRole | undefined;
  const isStaff = !!role && hasRole(role, "COACH");
  const section = activeAdminSection(pathname);
  const moreActive = !!section && !section.inBar;
  // La preferenza salvata è nota solo dopo il mount.
  const currentMode = mounted ? mode : "system";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  async function handleSignOut() {
    await purgeServiceWorkerCaches();
    await signOut({ callbackUrl: "/" });
  }

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: "appBar",
        bgcolor: "adminBand.bg",
        color: "adminBand.text",
        borderBottom: 1,
        borderColor: "adminBand.border",
      }}
    >
      <Container
        maxWidth="lg"
        sx={{ display: "flex", alignItems: "center", gap: 1, height: BAR_HEIGHT }}
      >
        {isStaff && (
          <IconButton
            ref={menuButtonRef}
            onClick={() => setDrawerOpen(true)}
            aria-label="Apri il menu dell'amministrazione"
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            sx={{ ...TOUCH_TARGET, ml: -1, color: "inherit", display: { lg: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Il logo è l'uscita verso il sito, a ogni larghezza e con un tocco
            solo: come in ogni pagina pubblica, porta alla home. Su telefono è
            l'unica uscita sempre in vista ("Torna al sito" scritto sta nel
            menu), e da lì si ritrova la barra in basso. */}
        <Tooltip title="Torna al sito">
          <MuiLink
            href="/"
            aria-label="Karibu Baskin, torna al sito"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              minWidth: 44,
              minHeight: 44,
            }}
          >
            <Image src="/logo.png" alt="" width={32} height={32} style={{ objectFit: "contain" }} />
          </MuiLink>
        </Tooltip>
        <Box
          sx={{
            alignItems: "center",
            gap: 0.5,
            flexShrink: 0,
            color: "text.secondary",
            display: { xs: isStaff ? "none" : "flex", lg: "flex" },
          }}
        >
          <ShieldIcon sx={{ fontSize: 16 }} />
          <Typography
            component="span"
            variant="overline"
            sx={{ lineHeight: 1, fontWeight: FONT_WEIGHT.bold }}
          >
            Admin
          </Typography>
        </Box>

        {isStaff && (
          <>
            {/* Sotto lg: dove sono, a menu chiuso. */}
            <Box
              sx={{
                display: { xs: "flex", lg: "none" },
                alignItems: "center",
                gap: 0.5,
                minWidth: 0,
              }}
            >
              <ShieldIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
              <Typography component="p" variant="subtitle2" noWrap sx={{ minWidth: 0 }}>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", display: { xs: "none", sm: "inline" } }}
                >
                  Admin ·{" "}
                </Box>
                {section?.label ?? "Amministrazione"}
              </Typography>
            </Box>

            <Box
              component="nav"
              aria-label="Sezioni dell'amministrazione"
              sx={{ display: { xs: "none", lg: "flex" }, alignSelf: "stretch", ml: 1.5 }}
            >
              {BAR_ITEMS.map((item) => {
                const active = section?.href === item.href;
                return (
                  <Button
                    key={item.href}
                    href={item.href}
                    color="inherit"
                    aria-current={active ? "page" : undefined}
                    sx={barItemSx(active)}
                  >
                    {item.label}
                  </Button>
                );
              })}
              <Button
                color="inherit"
                onClick={(e) => setMoreAnchor(e.currentTarget)}
                aria-haspopup="menu"
                aria-expanded={moreAnchor ? "true" : undefined}
                aria-controls={moreAnchor ? "admin-more-menu" : undefined}
                endIcon={<KeyboardArrowDownIcon />}
                sx={barItemSx(moreActive)}
              >
                {moreActive ? section.label : "Altro"}
              </Button>
              <Menu
                id="admin-more-menu"
                anchorEl={moreAnchor}
                open={!!moreAnchor}
                onClose={() => setMoreAnchor(null)}
                slotProps={{ list: { "aria-label": "Altre sezioni", dense: true } }}
              >
                {MORE_GROUPS.flatMap((group: Exclude<AdminNavGroup, "main">, index) => [
                  index > 0 && <Divider key={`${group}-divider`} />,
                  <ListSubheader key={group} sx={{ lineHeight: 2.5, typography: "overline" }}>
                    {ADMIN_NAV_GROUP_LABELS[group]}
                  </ListSubheader>,
                  ...MORE_ITEMS.filter((i) => i.group === group).map((item) => (
                    <MenuItem
                      key={item.href}
                      href={item.href}
                      selected={section?.href === item.href}
                      aria-current={section?.href === item.href ? "page" : undefined}
                      onClick={() => setMoreAnchor(null)}
                      sx={{ minHeight: 44, minWidth: 220 }}
                    >
                      {item.label}
                    </MenuItem>
                  )),
                ])}
              </Menu>
            </Box>
          </>
        )}

        <Box sx={{ flex: 1 }} />

        <Button
          href="/"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          sx={{
            whiteSpace: "nowrap",
            flexShrink: 0,
            minHeight: { xs: 44, lg: 40 },
            // Su telefono non c'è posto per la scritta: l'uscita è il logo, e
            // "Torna al sito" sta anche in fondo al menu.
            display: { xs: isStaff ? "none" : "inline-flex", md: "inline-flex" },
          }}
        >
          Torna al sito
        </Button>

        {isStaff && user && (
          <>
            <NotificationBell tone="surface" />
            <IconButton
              onClick={(e) => setUserAnchor(e.currentTarget)}
              aria-label="Menu utente"
              aria-haspopup="menu"
              aria-expanded={userAnchor ? "true" : undefined}
              sx={{ ...TOUCH_TARGET, p: 0.5, mr: -0.5 }}
            >
              <Avatar
                src={user.customImage ?? user.image ?? undefined}
                alt=""
                sx={{ width: 34, height: 34, fontSize: TYPE_SCALE.xs, bgcolor: "primary.fill" }}
              >
                {!(user.customImage ?? user.image) && initials}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={userAnchor}
              open={!!userAnchor}
              onClose={() => setUserAnchor(null)}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem href="/profilo" onClick={() => setUserAnchor(null)} sx={{ minHeight: 44 }}>
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                Il mio profilo
              </MenuItem>
              <Divider />
              {THEME_MODES.map((m) => (
                <MenuItem
                  key={m.mode}
                  role="menuitemradio"
                  aria-checked={currentMode === m.mode}
                  onClick={() => {
                    setMode(m.mode);
                    setUserAnchor(null);
                  }}
                  sx={{ minHeight: 44 }}
                >
                  <ListItemIcon>{m.icon}</ListItemIcon>
                  <ListItemText>{m.label}</ListItemText>
                  {currentMode === m.mode && (
                    <CheckIcon fontSize="small" sx={{ ml: 1.5, color: "primary.main" }} />
                  )}
                </MenuItem>
              ))}
              <Divider />
              <MenuItem
                onClick={() => {
                  setUserAnchor(null);
                  void handleSignOut();
                }}
                sx={{ minHeight: 44, color: "error.main" }}
              >
                <ListItemIcon>
                  <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
                </ListItemIcon>
                Esci
              </MenuItem>
            </Menu>
          </>
        )}
      </Container>

      {isStaff && (
        <AdminNavDrawer
          open={drawerOpen}
          currentHref={section?.href ?? null}
          onClose={() => {
            setDrawerOpen(false);
            // Il focus torna al bottone che ha aperto il menu.
            menuButtonRef.current?.focus();
          }}
        />
      )}
    </Box>
  );
}
