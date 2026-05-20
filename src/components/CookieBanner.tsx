"use client";
import { Box, Button, Typography, Paper, Link as MuiLink } from "@mui/material";
import NextLink from "next/link";
import CookieIcon from "@mui/icons-material/Cookie";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useHasMounted } from "@/lib/useHasMounted";

export default function CookieBanner() {
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
            Questo sito usa cookie di terze parti
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            La pagina Contatti incorpora una mappa Google Maps che installa cookie di profilazione.
            Accetta per caricare la mappa, oppure rifiuta per visualizzare solo un link esterno.{" "}
            <MuiLink component={NextLink} href="/privacy" sx={{ fontSize: "inherit" }}>
              Informativa privacy
            </MuiLink>
            .
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Button size="small" variant="outlined" onClick={reject} sx={{ fontWeight: 600 }}>
          Solo necessari
        </Button>
        <Button size="small" variant="contained" onClick={accept} sx={{ fontWeight: 700 }}>
          Accetta tutto
        </Button>
      </Box>
    </Paper>
  );
}
