"use client";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography,
} from "@mui/material";
import LinkBehavior from "@/components/common/LinkBehavior";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ArticleIcon from "@mui/icons-material/Article";
import CollectionsIcon from "@mui/icons-material/Collections";
import PersonIcon from "@mui/icons-material/Person";
import GroupsIcon from "@mui/icons-material/Groups";
import TableChartIcon from "@mui/icons-material/TableChart";
import ShieldIcon from "@mui/icons-material/Shield";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import InsightsIcon from "@mui/icons-material/Insights";
import DownloadIcon from "@mui/icons-material/Download";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import CampaignIcon from "@mui/icons-material/Campaign";
import HistoryIcon from "@mui/icons-material/History";
import type { ReactNode } from "react";
import {
  ADMIN_NAV,
  ADMIN_NAV_GROUP_LABELS,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/lib/adminNav";
import { TOUCH_TARGET } from "@/lib/touchTarget";
import { FONT_WEIGHT } from "@/lib/fontWeight";

// Le stesse icone della dashboard, per ritrovare le voci a colpo d'occhio.
const ICONS: Record<string, ReactNode> = {
  "/admin": <DashboardIcon />,
  "/admin/allenamenti": <SportsBasketballIcon />,
  "/admin/partite": <EmojiEventsIcon />,
  "/admin/eventi": <CalendarMonthIcon />,
  "/admin/news": <ArticleIcon />,
  "/admin/gallery": <CollectionsIcon />,
  "/admin/utenti": <PersonIcon />,
  "/admin/squadre": <GroupsIcon />,
  "/admin/gironi": <TableChartIcon />,
  "/admin/avversarie": <ShieldIcon />,
  "/admin/sviluppo": <TrendingUpIcon />,
  "/admin/metriche": <InsightsIcon />,
  "/admin/esporta": <DownloadIcon />,
  "/admin/suggerimenti": <LightbulbIcon />,
  "/admin/avvisi": <CampaignIcon />,
  "/admin/audit": <HistoryIcon />,
};

const GROUPS: Exclude<AdminNavGroup, "main">[] = ["attivita", "anagrafiche", "strumenti"];

interface AdminNavDrawerProps {
  open: boolean;
  /** `href` della sezione in cui si è, o `null`. */
  currentHref: string | null;
  onClose: () => void;
}

/**
 * Menu del pannello staff sotto `lg` (UX-40): tutte le sezioni, con i gruppi
 * della dashboard, e in fondo l'uscita verso il sito pubblico.
 */
export default function AdminNavDrawer({ open, currentHref, onClose }: AdminNavDrawerProps) {
  const item = (entry: AdminNavItem) => {
    const active = currentHref === entry.href;
    return (
      <ListItemButton
        key={entry.href}
        // ListItemButton è un <div>: senza `component` il tema non lo fa
        // diventare un link e `href` non porta da nessuna parte.
        component={LinkBehavior}
        href={entry.href}
        selected={active}
        aria-current={active ? "page" : undefined}
        onClick={onClose}
        sx={{ minHeight: 48, px: 2 }}
      >
        <ListItemIcon sx={{ minWidth: 40, color: active ? "primary.onLight" : "text.secondary" }}>
          {ICONS[entry.href]}
        </ListItemIcon>
        <ListItemText
          primary={entry.label}
          slotProps={{
            primary: {
              variant: "body2",
              sx: {
                fontWeight: active ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                color: active ? "primary.onLight" : "text.primary",
              },
            },
          }}
        />
      </ListItemButton>
    );
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: 280, maxWidth: "85vw", display: "flex", flexDirection: "column" } },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pl: 2,
          pr: 1,
          minHeight: 56,
          flexShrink: 0,
        }}
      >
        <Typography component="p" variant="subtitle1">
          Amministrazione
        </Typography>
        <IconButton onClick={onClose} aria-label="Chiudi il menu" sx={TOUCH_TARGET}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      <Box
        component="nav"
        aria-label="Menu dell'amministrazione"
        sx={{ flex: 1, overflowY: "auto" }}
      >
        <List disablePadding>{ADMIN_NAV.filter((i) => i.group === "main").map(item)}</List>
        {GROUPS.map((group) => (
          <List
            key={group}
            disablePadding
            aria-labelledby={`admin-nav-${group}`}
            subheader={
              <ListSubheader
                id={`admin-nav-${group}`}
                disableSticky
                sx={{ typography: "overline", lineHeight: 2.5, mt: 1, bgcolor: "transparent" }}
              >
                {ADMIN_NAV_GROUP_LABELS[group]}
              </ListSubheader>
            }
          >
            {ADMIN_NAV.filter((i) => i.group === group).map(item)}
          </List>
        ))}
      </Box>

      <Divider />
      <ListItemButton
        component={LinkBehavior}
        href="/"
        onClick={onClose}
        sx={{ minHeight: 56, px: 2, flexGrow: 0 }}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          <ArrowBackIcon />
        </ListItemIcon>
        <ListItemText
          primary="Torna al sito"
          slotProps={{ primary: { variant: "body2", sx: { fontWeight: FONT_WEIGHT.semibold } } }}
        />
      </ListItemButton>
    </Drawer>
  );
}
