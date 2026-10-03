"use client";
import { useState } from "react";
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
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import LanguageIcon from "@mui/icons-material/Language";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { purgeServiceWorkerCaches } from "@/lib/swCachePurge";
import { hasRole } from "@/lib/authRoles";
import type { AppRole } from "@prisma/client";
import Image from "next/image";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useThemeMode } from "@/context/ThemeContext";
import Tooltip from "@mui/material/Tooltip";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import GlobalSearch from "@/components/layout/GlobalSearch";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";
import { alpha } from "@mui/material/styles";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import { slugify } from "@/lib/slugUtils";
import { TOUCH_TARGET, TOUCH_TARGET_SIZE } from "@/lib/touchTarget";
import { TYPE_SCALE } from "@/lib/typeScale";
import { heroText } from "@/lib/heroStyles";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

// href-only — le label vengono da t() dentro il componente.
// Niente voce "Home": ci porta il logo, e lo spazio della barra serve alle voci
// con il nome (UX-44).
const NAV_HREFS = [
  { key: "trainings" as const, href: "/allenamenti" },
  { key: "calendar" as const, href: "/calendario" },
  { key: "events" as const, href: "/eventi" },
  { key: "news" as const, href: "/news" },
];

// Voci la cui attivazione si basa su startsWith (hanno pagine di dettaglio).
const STARTSWITH_NAV = ["/news", "/eventi"];

const PARTITE_HREFS = [
  { key: "nextMatches" as const, href: "/partite" },
  { key: "results" as const, href: "/risultati" },
  { key: "standings" as const, href: "/classifiche" },
  { key: "scorers" as const, href: "/marcatori" },
];

const IL_BASKIN_HREFS: { key: string; href: string; disabled?: boolean; badge?: string }[] = [
  { key: "whatIsBaskin", href: "/il-baskin" },
  { key: "gallery", href: "/gallery" },
];

const CONTATTI_HREFS = [
  { key: "contacts" as const, href: "/contatti" },
  { key: "guide" as const, href: "/guida" },
  { key: "faq" as const, href: "/faq" },
  { key: "sponsor" as const, href: "/sponsor" },
];

/**
 * Voci della barra: mai a capo e senza la larghezza minima di MUI (64 px), che
 * lasciava spazio vuoto attorno a "News" ed "Eventi" (UX-44).
 */
const NAV_ITEM_SX = { whiteSpace: "nowrap", minWidth: 0, flexShrink: 0 } as const;

/**
 * Da qui in su il menu completo sta nella barra (UX-44). Sotto, fino a `md`
 * (dove compare la barra in basso), il menu compatto: le voci vanno nel
 * drawer, mentre ricerca, tema, lingua, campanella e avatar restano. A 900 px
 * le voci sforavano di quasi 100 px anche senza il nome del club.
 */
const FULL_NAV = "@media (min-width:1024px)";
/** Fra il menu completo e `lg` il nome del club lascia spazio alle voci. */
const NAV_WITHOUT_CLUB_NAME = "@media (min-width:1024px) and (max-width:1199.95px)";

const COLOR_MODE_ORDER = ["light", "dark", "system"] as const;
type ColorMode = (typeof COLOR_MODE_ORDER)[number];

function ThemeModeIcon({ mode }: { mode: ColorMode }) {
  if (mode === "light") return <LightModeIcon fontSize="small" />;
  if (mode === "dark") return <DarkModeIcon fontSize="small" />;
  return <SettingsBrightnessIcon fontSize="small" />;
}

interface SiteHeaderProps {
  /** Stagione in corso (flag dello staff, o calendario): arriva dal layout. */
  currentSeason: string;
}

export default function SiteHeader({ currentSeason }: SiteHeaderProps) {
  const t = useTranslations("nav");
  const router = useRouter();

  /**
   * Uscire deve lasciare pulito anche il dispositivo: il service worker tiene in
   * cache pagine e risposte API che, su un account loggato, sono personalizzate.
   * La pulizia ha un timeout interno e non può bloccare il logout.
   */
  async function handleSignOut() {
    await purgeServiceWorkerCaches();
    await signOut({ callbackUrl: "/" });
  }

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
  const { mode: colorMode, setMode: setColorMode } = useThemeMode();

  function cycleColorMode() {
    const idx = COLOR_MODE_ORDER.indexOf(colorMode as ColorMode);
    setColorMode(COLOR_MODE_ORDER[(idx + 1) % COLOR_MODE_ORDER.length]);
  }
  // Nessun gate sul mount: usePathname e gia risolto durante il render sul
  // server, cosi la voce attiva e evidenziata gia al primo frame.
  const pathname = usePathname();
  const partiteActive =
    pathname === "/risultati" ||
    pathname === "/classifiche" ||
    pathname === "/marcatori" ||
    (pathname?.startsWith("/partite") ?? false);
  // "Chi siamo" (`/il-club`) sta nel menu Squadre (UX-36b).
  const squadreActive = (pathname?.startsWith("/squadre") ?? false) || pathname === "/il-club";
  const ilBaskinActive = pathname === "/il-baskin" || pathname === "/gallery";
  const contattiActive = CONTATTI_HREFS.some((l) => l.href === pathname);

  // Squadre della stagione corrente per i link dinamici del dropdown
  const { data: allTeams } = useQuery<{ id: string; name: string; season: string }[]>({
    queryKey: ["competitive-teams"],
    // Su un errore (anche un 429) la query fallisce e le squadre restano
    // vuote: prima il corpo di errore finiva in `allTeams` e il `.filter`
    // qui sotto faceva cadere l'intero sito nell'errore critico.
    queryFn: () => fetchJson("/api/competitive-teams"),
  });
  const currentTeams = (allTeams ?? []).filter((t) => t.season === currentSeason);
  const squadreLinks = [
    { label: t("allTeams"), href: "/squadre" },
    ...currentTeams.map((team) => ({
      label: team.name,
      href: `/squadre/${currentSeason.replace("-", "")}/${slugify(team.name)}`,
    })),
    { label: t("archive"), href: "/squadre/archivio" },
    { label: t("whoWeAre"), href: "/il-club" },
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
          // Filo arancione sotto l'header: e' il segno del marchio sulla barra
          // (famiglia "nero del marchio"), non UI di contenuto. Pieno e di 3 px
          // (01/10): a 1 px e al 35% sul nero si leggeva marrone, e spariva.
          borderBottom: "3px solid",
          borderColor: "primary.main",
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
              // Su mobile resta solo il logo da 38px: senza questo il bersaglio
              // sta sotto la soglia tattile.
              minHeight: TOUCH_TARGET_SIZE,
            }}
          >
            <Image
              src="/logo.png"
              alt="Karibu Baskin"
              width={38}
              height={38}
              style={{ objectFit: "contain" }}
            />
            {/* Fra 1.024 e 1.200 px il nome lascia spazio al menu: resta il logo (UX-44) */}
            <Box
              sx={{
                display: { xs: "none", sm: "block" },
                [NAV_WITHOUT_CLUB_NAME]: { display: "none" },
              }}
            >
              <Typography
                component="span"
                variant="subtitle2"
                fontWeight={FONT_WEIGHT.bold}
                sx={{
                  display: "block",
                  color: "common.white",
                  lineHeight: 1.1,
                  fontSize: TYPE_SCALE.sm,
                }}
              >
                Karibu Baskin
              </Typography>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  display: "block",
                  color: (theme) => alpha(theme.palette.common.white, 0.5),
                  fontSize: TYPE_SCALE.xs,
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
            component="nav"
            aria-label={t("mainNav")}
            sx={{
              display: "none",
              [FULL_NAV]: { display: "flex" },
              gap: 0.5,
              ml: 3,
              flex: 1,
              alignItems: "center",
            }}
          >
            {/* Voci semplici: Allenamenti, Calendario, Eventi, News */}
            {NAV_HREFS.map((link) => {
              const active = STARTSWITH_NAV.includes(link.href)
                ? (pathname?.startsWith(link.href) ?? false)
                : pathname === link.href;
              return (
                <Button
                  key={link.href}
                  component={Link}
                  href={link.href}
                  size="small"
                  aria-current={active ? "page" : undefined}
                  sx={{
                    ...NAV_ITEM_SX,
                    color: active
                      ? "common.white"
                      : (theme) => alpha(theme.palette.common.white, 0.6),
                    fontWeight: active ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                    fontSize: TYPE_SCALE.sm,
                    borderBottom: active ? "2px solid" : "2px solid transparent",
                    borderBottomColor: active ? "primary.main" : "transparent",
                    borderRadius: 0,
                    pb: "2px",
                    "&:hover": { color: "common.white", backgroundColor: "transparent" },
                  }}
                >
                  {t(link.key)}
                </Button>
              );
            })}

            {/* Dropdown Partite */}
            <Button
              size="small"
              onClick={(e) => setPartiteAnchor(e.currentTarget)}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: "0.9rem !important", ml: -0.5 }} />}
              sx={{
                ...NAV_ITEM_SX,
                color: partiteActive
                  ? "common.white"
                  : (theme) => alpha(theme.palette.common.white, 0.6),
                fontWeight: partiteActive ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                fontSize: TYPE_SCALE.sm,
                borderBottom: partiteActive ? "2px solid" : "2px solid transparent",
                borderBottomColor: partiteActive ? "primary.main" : "transparent",
                borderRadius: 0,
                pb: "2px",
                "&:hover": { color: "common.white", backgroundColor: "transparent" },
              }}
            >
              {t("matches")}
            </Button>
            <Menu
              anchorEl={partiteAnchor}
              open={Boolean(partiteAnchor)}
              onClose={() => setPartiteAnchor(null)}
              transformOrigin={{ horizontal: "left", vertical: "top" }}
              anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
              PaperProps={{ sx: { mt: 0.5, minWidth: 150 } }}
            >
              {PARTITE_HREFS.map((pl) => (
                <MenuItem
                  key={pl.href}
                  component={Link}
                  href={pl.href}
                  selected={pathname === pl.href}
                  aria-current={pathname === pl.href ? "page" : undefined}
                  onClick={() => setPartiteAnchor(null)}
                  sx={{
                    fontSize: TYPE_SCALE.sm,
                    fontWeight: pathname === pl.href ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                  }}
                >
                  {t(pl.key)}
                </MenuItem>
              ))}
            </Menu>

            {/* Dropdown Squadre */}
            <Button
              size="small"
              onClick={(e) => setSquadreAnchor(e.currentTarget)}
              endIcon={<KeyboardArrowDownIcon sx={{ fontSize: "0.9rem !important", ml: -0.5 }} />}
              sx={{
                ...NAV_ITEM_SX,
                color: squadreActive
                  ? "common.white"
                  : (theme) => alpha(theme.palette.common.white, 0.6),
                fontWeight: squadreActive ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                fontSize: TYPE_SCALE.sm,
                borderBottom: squadreActive ? "2px solid" : "2px solid transparent",
                borderBottomColor: squadreActive ? "primary.main" : "transparent",
                borderRadius: 0,
                pb: "2px",
                "&:hover": { color: "common.white", backgroundColor: "transparent" },
              }}
            >
              {t("teams")}
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
                  aria-current={pathname === sl.href ? "page" : undefined}
                  onClick={() => setSquadreAnchor(null)}
                  sx={{
                    fontSize: TYPE_SCALE.sm,
                    fontWeight: pathname === sl.href ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                  }}
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
                ...NAV_ITEM_SX,
                color: ilBaskinActive
                  ? "common.white"
                  : (theme) => alpha(theme.palette.common.white, 0.6),
                fontWeight: ilBaskinActive ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                fontSize: TYPE_SCALE.sm,
                borderBottom: ilBaskinActive ? "2px solid" : "2px solid transparent",
                borderBottomColor: ilBaskinActive ? "primary.main" : "transparent",
                borderRadius: 0,
                pb: "2px",
                "&:hover": { color: "common.white", backgroundColor: "transparent" },
              }}
            >
              {t("baskin")}
            </Button>
            <Menu
              anchorEl={ilBaskinAnchor}
              open={Boolean(ilBaskinAnchor)}
              onClose={() => setIlBaskinAnchor(null)}
              transformOrigin={{ horizontal: "left", vertical: "top" }}
              anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
              PaperProps={{ sx: { mt: 0.5, minWidth: 170 } }}
            >
              {IL_BASKIN_HREFS.map((bl) => (
                <MenuItem
                  key={bl.href}
                  component={bl.disabled ? "li" : Link}
                  href={bl.disabled ? undefined : bl.href}
                  selected={pathname === bl.href}
                  aria-current={pathname === bl.href ? "page" : undefined}
                  disabled={bl.disabled}
                  onClick={() => !bl.disabled && setIlBaskinAnchor(null)}
                  sx={{
                    fontSize: TYPE_SCALE.sm,
                    fontWeight: pathname === bl.href ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                    gap: 1,
                  }}
                >
                  {t(bl.key)}
                  {bl.badge && (
                    <Box
                      component="span"
                      sx={{
                        ml: "auto",
                        fontSize: TYPE_SCALE.xs,
                        px: 0.6,
                        py: 0.1,
                        borderRadius: RADIUS.sm,
                        bgcolor: "action.selected",
                        color: "text.secondary",
                        fontWeight: FONT_WEIGHT.semibold,
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
                ...NAV_ITEM_SX,
                color: contattiActive
                  ? "common.white"
                  : (theme) => alpha(theme.palette.common.white, 0.6),
                fontWeight: contattiActive ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                fontSize: TYPE_SCALE.sm,
                borderBottom: contattiActive ? "2px solid" : "2px solid transparent",
                borderBottomColor: contattiActive ? "primary.main" : "transparent",
                borderRadius: 0,
                pb: "2px",
                "&:hover": { color: "common.white", backgroundColor: "transparent" },
              }}
            >
              {t("contacts")}
            </Button>
            <Menu
              anchorEl={contattiAnchor}
              open={Boolean(contattiAnchor)}
              onClose={() => setContattiAnchor(null)}
              transformOrigin={{ horizontal: "left", vertical: "top" }}
              anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
              PaperProps={{ sx: { mt: 0.5, minWidth: 140 } }}
            >
              {CONTATTI_HREFS.map((cl) => (
                <MenuItem
                  key={cl.href}
                  component={Link}
                  href={cl.href}
                  selected={pathname === cl.href}
                  aria-current={pathname === cl.href ? "page" : undefined}
                  onClick={() => setContattiAnchor(null)}
                  sx={{
                    fontSize: TYPE_SCALE.sm,
                    fontWeight: pathname === cl.href ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                  }}
                >
                  {t(cl.key)}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          <Box sx={{ flex: 1, [FULL_NAV]: { flex: 0 } }} />

          {/* Ricerca globale — visibile sempre (desktop + mobile) */}
          <GlobalSearch />

          {/* Selettore tema + lingua (desktop) — visibili a tutti, loggati e non */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1, mr: 0.5 }}>
            <ThemeSwitcher />
            <LanguageSwitcher onDark />
          </Box>

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
                  aria-label={t("userMenu")}
                  sx={{ p: 0.5 }}
                >
                  <Avatar
                    src={user.customImage ?? user.image ?? undefined}
                    alt={user.name ?? "Utente"}
                    sx={{
                      width: 34,
                      height: 34,
                      fontSize: TYPE_SCALE.xs,
                      bgcolor: "primary.fill",
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
                    <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
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
                    {t("myProfile")}
                  </MenuItem>
                  {/* Solo a chi può avere partite a cui rispondere (UX-46). */}
                  {user.showsAvailabilities && (
                    <MenuItem
                      onClick={() => {
                        setMenuAnchor(null);
                        router.push("/profilo/disponibilita");
                      }}
                    >
                      <ListItemIcon>
                        <EventAvailableIcon fontSize="small" />
                      </ListItemIcon>
                      {t("myAvailabilities")}
                    </MenuItem>
                  )}
                  {isStaff && (
                    <MenuItem
                      onClick={() => {
                        setMenuAnchor(null);
                        router.push("/admin");
                      }}
                      sx={{ color: "primary.onLight", fontWeight: FONT_WEIGHT.semibold }}
                    >
                      <ListItemIcon>
                        <AdminPanelSettingsIcon fontSize="small" sx={{ color: "primary.main" }} />
                      </ListItemIcon>
                      {t("admin")}
                    </MenuItem>
                  )}
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      void handleSignOut();
                    }}
                    sx={{ color: "error.main" }}
                  >
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
                    </ListItemIcon>
                    {t("logout")}
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  onClick={() => router.push("/login")}
                  size="small"
                  variant="outlined"
                  sx={{
                    color: "common.white",
                    borderColor: (theme) => alpha(theme.palette.common.white, 0.3),
                    fontSize: TYPE_SCALE.xs,
                    "&:hover": { borderColor: "common.white" },
                  }}
                >
                  {t("login")}
                </Button>
              </Box>
            )}
          </Box>

          {/* Hamburger: mobile e menu compatto fino a 1.024 px */}
          <IconButton
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("openMenu")}
            sx={{ ...TOUCH_TARGET, [FULL_NAV]: { display: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer: tutte le voci, su mobile e nel menu compatto */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 240,
            bgcolor: "appBar.from",
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
            component="span"
            variant="subtitle2"
            sx={{
              color: (theme) => alpha(theme.palette.common.white, 0.5),
              textTransform: "uppercase",
              fontSize: TYPE_SCALE.xs,
              letterSpacing: "0.08em",
            }}
          >
            {t("explore")}
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => setDrawerOpen(false)}
            size="small"
            aria-label={t("closeMenu")}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: (theme) => alpha(theme.palette.common.white, 0.08) }} />

        {/* Nav mobile */}
        <List component="nav" aria-label={t("mainNav")} disablePadding sx={{ flex: 1 }}>
          {/* Voci semplici prima di "Partite" */}
          {[
            { key: "trainings" as const, href: "/allenamenti" },
            { key: "calendar" as const, href: "/calendario" },
            { key: "events" as const, href: "/eventi" },
            { key: "news" as const, href: "/news" },
          ].map((link) => {
            const active = STARTSWITH_NAV.includes(link.href)
              ? (pathname?.startsWith(link.href) ?? false)
              : pathname === link.href;
            return (
              <ListItem key={link.href} disablePadding>
                <ListItemButton
                  aria-current={active ? "page" : undefined}
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
                    primary={t(link.key)}
                    primaryTypographyProps={{
                      fontWeight: active ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                      fontSize: TYPE_SCALE.md,
                    }}
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
                primary={t("matches")}
                primaryTypographyProps={{
                  fontWeight: partiteActive ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                  fontSize: TYPE_SCALE.md,
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
              {PARTITE_HREFS.map((link) => {
                const active = pathname === link.href;
                return (
                  <ListItem key={link.href} disablePadding>
                    <ListItemButton
                      aria-current={active ? "page" : undefined}
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
                        primary={t(link.key)}
                        primaryTypographyProps={{
                          fontWeight: active ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                          fontSize: TYPE_SCALE.sm,
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
                primary={t("teams")}
                primaryTypographyProps={{
                  fontWeight: squadreActive ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                  fontSize: TYPE_SCALE.md,
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
                      aria-current={active ? "page" : undefined}
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
                          fontWeight: active ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                          fontSize: TYPE_SCALE.sm,
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
                primary={t("baskin")}
                primaryTypographyProps={{
                  fontWeight: ilBaskinActive ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                  fontSize: TYPE_SCALE.md,
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
              {IL_BASKIN_HREFS.map((link) => {
                const active = pathname === link.href;
                return (
                  <ListItem key={link.href} disablePadding>
                    <ListItemButton
                      aria-current={active ? "page" : undefined}
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
                        primary={t(link.key)}
                        primaryTypographyProps={{
                          fontWeight: active ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                          fontSize: TYPE_SCALE.sm,
                        }}
                      />
                      {link.badge && (
                        <Box
                          component="span"
                          sx={{
                            fontSize: TYPE_SCALE.xs,
                            px: 0.6,
                            py: 0.1,
                            borderRadius: RADIUS.sm,
                            bgcolor: (theme) => alpha(theme.palette.common.white, 0.1),
                            color: (theme) => alpha(theme.palette.common.white, 0.4),
                            fontWeight: FONT_WEIGHT.semibold,
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
                primary={t("contacts")}
                primaryTypographyProps={{
                  fontWeight: contattiActive ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                  fontSize: TYPE_SCALE.md,
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
              {CONTATTI_HREFS.map((link) => {
                const active = pathname === link.href;
                return (
                  <ListItem key={link.href} disablePadding>
                    <ListItemButton
                      aria-current={active ? "page" : undefined}
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
                        primary={t(link.key)}
                        primaryTypographyProps={{
                          fontWeight: active ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                          fontSize: TYPE_SCALE.sm,
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
                    color: "primary.light",
                    borderLeft: "3px solid",
                    borderLeftColor: "primary.main",
                  }}
                >
                  <ListItemText
                    primary={t("admin")}
                    primaryTypographyProps={{
                      fontWeight: FONT_WEIGHT.semibold,
                      fontSize: TYPE_SCALE.md,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>

        {/* Footer drawer: sezione utente */}
        <Box>
          <Divider sx={{ borderColor: (theme) => alpha(theme.palette.common.white, 0.08) }} />
          {/* Tema — riga dedicata */}
          <ListItemButton
            onClick={cycleColorMode}
            sx={{ py: 1.25, color: (theme) => alpha(theme.palette.common.white, 0.7) }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              <ThemeModeIcon mode={colorMode as ColorMode} />
            </ListItemIcon>
            <ListItemText
              primary={t(
                `theme${colorMode.charAt(0).toUpperCase()}${colorMode.slice(1)}` as
                  | "themeLight"
                  | "themeDark"
                  | "themeSystem"
              )}
              primaryTypographyProps={{ fontSize: TYPE_SCALE.sm }}
            />
          </ListItemButton>

          {/* Lingua — riga dedicata, leggibile su drawer scuro, accanto al tema */}
          <Box
            sx={{
              px: 2,
              py: 1.25,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                color: (theme) => alpha(theme.palette.common.white, 0.7),
              }}
            >
              <LanguageIcon fontSize="small" />
              <Typography sx={{ fontSize: TYPE_SCALE.sm }}>{t("language")}</Typography>
            </Box>
            <LanguageSwitcher onDark />
          </Box>

          {/* Logout (solo loggati) — sotto tema e lingua */}
          {user && (
            <>
              <Divider sx={{ borderColor: (theme) => alpha(theme.palette.common.white, 0.08) }} />
              <ListItemButton
                onClick={() => {
                  setDrawerOpen(false);
                  void handleSignOut();
                }}
                sx={{ py: 1.25, color: "error.main" }}
              >
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
                </ListItemIcon>
                <ListItemText
                  primary={t("logout")}
                  primaryTypographyProps={{ fontSize: TYPE_SCALE.md }}
                />
              </ListItemButton>
            </>
          )}

          <Box
            sx={{
              px: 2,
              py: 1,
              display: "flex",
              alignItems: "center",
              borderTop: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
            }}
          >
            <Link
              href="/privacy"
              onClick={() => setDrawerOpen(false)}
              style={{
                fontSize: TYPE_SCALE.xs,
                color: heroText.muted,
                textDecoration: "underline",
                textDecorationColor: heroText.line,
              }}
            >
              {t("privacyPolicy")}
            </Link>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
