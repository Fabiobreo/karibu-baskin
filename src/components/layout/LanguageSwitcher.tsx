"use client";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { alpha } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { useLocaleSwitch } from "@/context/LocaleContext";
import { LOCALES } from "@/i18n/locales";
import { TOUCH_TARGET_MIN } from "@/lib/touchTarget";
import { RADIUS } from "@/lib/radius";

interface LanguageSwitcherProps {
  /** Stili pensati per superfici scure (header/drawer): testo bianco trasparente */
  onDark?: boolean;
}

/**
 * Selettore di lingua compatto (UX-12): un solo bottone "IT · EN" con la lingua
 * corrente evidenziata; un tocco passa alla successiva. Resta visibile anche a
 * chi non ha fatto l'accesso (le famiglie straniere non hanno un menu utente),
 * sempre con testo, mai solo una bandiera. Prima erano due bottoni, cioe' due
 * fermate di Tab.
 */
export default function LanguageSwitcher({ onDark = false }: LanguageSwitcherProps) {
  const t = useTranslations("nav");
  const { locale, setLocale, isPending } = useLocaleSwitch();
  const next = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length];

  return (
    <ButtonBase
      onClick={() => setLocale(next)}
      disabled={isPending}
      aria-label={t("languageSwitch", {
        current: locale.toUpperCase(),
        next: next.toUpperCase(),
      })}
      sx={{
        ...TOUCH_TARGET_MIN,
        px: 1.25,
        gap: 0.75,
        borderRadius: RADIUS.md,
        border: "1px solid",
        borderColor: (theme) =>
          onDark ? alpha(theme.palette.common.white, 0.18) : theme.palette.divider,
        typography: "caption",
        fontWeight: 700,
        letterSpacing: "0.04em",
        "&:hover": {
          bgcolor: (theme) =>
            onDark ? alpha(theme.palette.common.white, 0.08) : theme.palette.action.hover,
        },
      }}
    >
      {LOCALES.map((l, i) => (
        <Box key={l} component="span" sx={{ display: "inline-flex", gap: 0.75 }}>
          {i > 0 && (
            <Box
              component="span"
              aria-hidden="true"
              sx={{
                color: (theme) =>
                  onDark ? alpha(theme.palette.common.white, 0.4) : theme.palette.text.secondary,
              }}
            >
              ·
            </Box>
          )}
          <Box
            component="span"
            sx={{
              color: (theme) =>
                l === locale
                  ? onDark
                    ? theme.palette.primary.light
                    : theme.palette.primary.onLight
                  : onDark
                    ? alpha(theme.palette.common.white, 0.7)
                    : theme.palette.text.secondary,
              textDecoration: l === locale ? "underline" : "none",
              textUnderlineOffset: 3,
            }}
          >
            {l.toUpperCase()}
          </Box>
        </Box>
      ))}
    </ButtonBase>
  );
}
