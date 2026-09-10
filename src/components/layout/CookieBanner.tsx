"use client";
import { Box, Button, Typography, Paper, Link as MuiLink } from "@mui/material";
import NextLink from "next/link";
import CookieIcon from "@mui/icons-material/Cookie";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useHasMounted } from "@/lib/useHasMounted";
import { useTranslations } from "next-intl";

/**
 * Banner di consenso per i cookie di terze parti (oggi: solo la mappa Google
 * su /contatti, vedi MapEmbed).
 *
 * Su mobile è compatto: a tutta dimensione occupava circa un terzo del primo
 * schermo e copriva la seconda CTA della hero, cioè il punto in cui un
 * genitore decide se restare. Il titolo si nasconde sotto `sm` ma resta come
 * nome accessibile della regione; il testo con il link all'informativa resta
 * sempre visibile, perché è l'informazione che il banner esiste per dare.
 */
export default function CookieBanner() {
  const t = useTranslations("cookie");
  const tNav = useTranslations("nav");
  const mounted = useHasMounted();
  const { decided, accept, reject } = useCookieConsent();

  if (!mounted || decided) return null;

  return (
    <Paper
      elevation={8}
      role="region"
      aria-label={t("title")}
      sx={{
        position: "fixed",
        bottom: { xs: 68, md: 16 }, // sopra la BottomNav su mobile
        left: { xs: 8, md: "auto" },
        right: { xs: 8, md: 24 },
        width: { md: 420 },
        zIndex: 1400,
        p: { xs: 1.5, sm: 2.5 },
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", mb: { xs: 1, sm: 1.5 } }}>
        <CookieIcon
          sx={{
            color: "primary.main",
            mt: 0.25,
            flexShrink: 0,
            display: { xs: "none", sm: "block" },
          }}
        />
        <Box>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            gutterBottom
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            {t("title")}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", lineHeight: { xs: 1.45, sm: 1.6 } }}
          >
            {t("body")}{" "}
            <MuiLink component={NextLink} href="/privacy" sx={{ fontSize: "inherit" }}>
              {tNav("privacyPolicy")}
            </MuiLink>
            .
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        {/* Su mobile i due bottoni si dividono la riga: stesso peso visivo per
            le due scelte, e nessuna riga in più per andare a capo. */}
        <Button
          size="small"
          variant="outlined"
          onClick={reject}
          sx={{ fontWeight: 600, flex: { xs: 1, sm: "0 0 auto" } }}
        >
          {t("necessaryOnly")}
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={accept}
          sx={{ fontWeight: 700, flex: { xs: 1, sm: "0 0 auto" } }}
        >
          {t("acceptAll")}
        </Button>
      </Box>
    </Paper>
  );
}
