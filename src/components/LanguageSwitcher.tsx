"use client";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { alpha } from "@mui/material/styles";
import { useLocaleSwitch } from "@/context/LocaleContext";
import { LOCALES, type Locale } from "@/i18n/locales";

interface LanguageSwitcherProps {
  /** Stili pensati per superfici scure (header/drawer): testo bianco trasparente */
  onDark?: boolean;
}

export default function LanguageSwitcher({ onDark = false }: LanguageSwitcherProps) {
  const { locale, setLocale, isPending } = useLocaleSwitch();

  return (
    <ToggleButtonGroup
      value={locale}
      exclusive
      onChange={(_, val: Locale | null) => {
        if (val) setLocale(val);
      }}
      size="small"
      disabled={isPending}
      aria-label="Lingua / Language"
      sx={{ height: 28 }}
    >
      {LOCALES.map((l) => (
        <ToggleButton
          key={l}
          value={l}
          sx={{
            px: 1,
            py: 0,
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            lineHeight: 1,
            ...(onDark && {
              color: (theme) => alpha(theme.palette.common.white, 0.55),
              borderColor: (theme) => alpha(theme.palette.common.white, 0.18),
              "&:hover": {
                color: "common.white",
                bgcolor: (theme) => alpha(theme.palette.common.white, 0.08),
              },
              "&.Mui-selected": {
                color: "primary.main",
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                "&:hover": {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                },
              },
            }),
          }}
        >
          {l.toUpperCase()}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
