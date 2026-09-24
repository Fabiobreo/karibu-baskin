"use client";
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import CheckIcon from "@mui/icons-material/Check";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import { alpha } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/lib/useHasMounted";
import { useThemeMode } from "@/context/ThemeContext";
import { TOUCH_TARGET_MIN } from "@/lib/touchTarget";

const MODES = ["light", "system", "dark"] as const;
type ColorMode = (typeof MODES)[number];

const ICONS: Record<ColorMode, React.ReactNode> = {
  light: <LightModeIcon fontSize="small" />,
  system: <SettingsBrightnessIcon fontSize="small" />,
  dark: <DarkModeIcon fontSize="small" />,
};

const LABEL_KEY: Record<ColorMode, "themeLight" | "themeSystem" | "themeDark"> = {
  light: "themeLight",
  system: "themeSystem",
  dark: "themeDark",
};

/**
 * Pulsante "Aspetto" dell'header (UX-12): un solo pulsante, con l'icona del
 * tema corrente, che apre un piccolo menu con le tre opzioni. Prima erano tre
 * bottoni sempre visibili, cioe' tre fermate di Tab per una preferenza rara.
 * Il menu ha gia' un'intestazione "Tema": altre preferenze di lettura (testo
 * piu' grande, testo facile) potranno aggiungersi sotto.
 */
export default function ThemeSwitcher() {
  const t = useTranslations("nav");
  const mounted = useHasMounted();
  const { mode, setMode } = useThemeMode();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  // Evita mismatch SSR: la preferenza salvata è nota solo dopo il mount
  const current = mounted ? (mode as ColorMode) : "system";
  const label = t("appearanceCurrent", { mode: t(LABEL_KEY[current]) });

  return (
    <>
      <Tooltip title={t("appearance")}>
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={anchor ? "true" : undefined}
          aria-controls={anchor ? "appearance-menu" : undefined}
          sx={{
            ...TOUCH_TARGET_MIN,
            color: (theme) => alpha(theme.palette.common.white, 0.75),
            border: "1px solid",
            borderColor: (theme) => alpha(theme.palette.common.white, 0.18),
            borderRadius: 2,
            "&:hover": {
              color: "common.white",
              bgcolor: (theme) => alpha(theme.palette.common.white, 0.08),
            },
          }}
        >
          {ICONS[current]}
        </IconButton>
      </Tooltip>
      <Menu
        id="appearance-menu"
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ list: { "aria-label": t("appearance"), dense: true } }}
      >
        <ListSubheader sx={{ lineHeight: 2.5, typography: "overline" }}>
          {t("appearanceTheme")}
        </ListSubheader>
        {MODES.map((m) => (
          <MenuItem
            key={m}
            role="menuitemradio"
            aria-checked={current === m}
            selected={current === m}
            onClick={() => {
              setMode(m);
              setAnchor(null);
            }}
            sx={{ minHeight: 44, minWidth: 200 }}
          >
            <ListItemIcon>{ICONS[m]}</ListItemIcon>
            <ListItemText>{t(LABEL_KEY[m])}</ListItemText>
            {current === m && (
              <CheckIcon fontSize="small" sx={{ ml: 1.5, color: "primary.main" }} />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
