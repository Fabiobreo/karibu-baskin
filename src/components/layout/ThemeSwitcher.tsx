"use client";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
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
  light: <LightModeIcon sx={{ fontSize: "1rem" }} />,
  system: <SettingsBrightnessIcon sx={{ fontSize: "1rem" }} />,
  dark: <DarkModeIcon sx={{ fontSize: "1rem" }} />,
};

const LABEL_KEY: Record<ColorMode, "themeLight" | "themeSystem" | "themeDark"> = {
  light: "themeLight",
  system: "themeSystem",
  dark: "themeDark",
};

export default function ThemeSwitcher() {
  const t = useTranslations("nav");
  const mounted = useHasMounted();
  const { mode, setMode } = useThemeMode();

  // Evita mismatch SSR: la preferenza salvata è nota solo dopo il mount
  const current = mounted ? (mode as ColorMode) : "system";

  return (
    <ToggleButtonGroup
      value={current}
      exclusive
      onChange={(_, val: ColorMode | null) => {
        if (val) setMode(val);
      }}
      aria-label={t("themeSystem")}
    >
      {MODES.map((m) => (
        <ToggleButton
          key={m}
          value={m}
          title={t(LABEL_KEY[m])}
          aria-label={t(LABEL_KEY[m])}
          sx={{
            // Erano 32x28: sotto la soglia tattile, e in fila di tre.
            ...TOUCH_TARGET_MIN,
            px: 0.9,
            py: 0,
            lineHeight: 1,
            color: (theme) => alpha(theme.palette.common.white, 0.55),
            borderColor: (theme) => alpha(theme.palette.common.white, 0.18),
            "&:hover": {
              color: "common.white",
              bgcolor: (theme) => alpha(theme.palette.common.white, 0.08),
            },
            "&.Mui-selected": {
              color: "primary.light",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              "&:hover": {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
              },
            },
          }}
        >
          {ICONS[m]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
