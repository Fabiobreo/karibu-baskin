"use client";
import { Box, Button, Typography, Paper, Link as MuiLink } from "@mui/material";
import NextLink from "next/link";
import CookieIcon from "@mui/icons-material/Cookie";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useHasMounted } from "@/lib/useHasMounted";
import { useTranslations } from "next-intl";

export default function CookieBanner() {
  const t = useTranslations("cookie");
  const tNav = useTranslations("nav");
  const mounted = useHasMounted();
  const { decided, accept, reject } = useCookieConsent();

  if (!mounted || decided) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: { xs: 68, md: 16 }, // sopra la BottomNav su mobile
        left: { xs: 8, md: "auto" },
        right: { xs: 8, md: 24 },
        width: { md: 420 },
        zIndex: 1400,
        p: 2.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", mb: 1.5 }}>
        <CookieIcon sx={{ color: "primary.main", mt: 0.25, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            {t("title")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {t("body")}{" "}
            <MuiLink component={NextLink} href="/privacy" sx={{ fontSize: "inherit" }}>
              {tNav("privacyPolicy")}
            </MuiLink>
            .
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Button size="small" variant="outlined" onClick={reject} sx={{ fontWeight: 600 }}>
          {t("necessaryOnly")}
        </Button>
        <Button size="small" variant="contained" onClick={accept} sx={{ fontWeight: 700 }}>
          {t("acceptAll")}
        </Button>
      </Box>
    </Paper>
  );
}
