import { Box, Typography, IconButton, Divider } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        display: { xs: "none", md: "block" },
        background: "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
        color: "rgba(255,255,255,0.85)",
        pt: { xs: 1, sm: 2 },
        pb: { xs: 1, sm: 1.5 },
        px: 2,
      }}
    >
      {/* ── Desktop: layout originale a colonne ── */}
      <Box
        sx={{
          display: { xs: "none", sm: "flex" },
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          maxWidth: 600,
          mx: "auto",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Image
            src="/logo.png"
            alt="Karibu Baskin"
            width={52}
            height={52}
            style={{ objectFit: "contain" }}
          />
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Karibu Baskin
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Montecchio Maggiore
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5, ml: 0.5 }}>
            <IconButton
              component="a"
              href="https://www.instagram.com/karibubaskin"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "#E1306C" }, p: 0.75 }}
              aria-label="Instagram"
            >
              <InstagramIcon fontSize="small" />
            </IconButton>
            <IconButton
              component="a"
              href="https://www.facebook.com/karibubaskin"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "#1877F2" }, p: 0.75 }}
              aria-label="Facebook"
            >
              <FacebookIcon fontSize="small" />
            </IconButton>
            <IconButton
              component="a"
              href="https://youtube.com/@karibubaskin"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "#FF0000" }, p: 0.75 }}
              aria-label="YouTube"
            >
              <YouTubeIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Divider sx={{ width: "100%", borderColor: "rgba(255,255,255,0.08)" }} />
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.35)" }}>
            © {year} Karibu Baskin Montecchio Maggiore
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Link
              href="/sponsor"
              style={{
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.45)",
                textDecorationColor: "rgba(255,255,255,0.2)",
              }}
            >
              Sponsor
            </Link>
            <Link
              href="/privacy"
              style={{
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.45)",
                textDecorationColor: "rgba(255,255,255,0.2)",
              }}
            >
              {t("privacyPolicy")}
            </Link>
          </Box>
        </Box>
      </Box>

      {/* ── Mobile: due righe per leggibilità ── */}
      <Box
        sx={{
          display: { xs: "flex", sm: "none" },
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Image
              src="/logo.png"
              alt="Karibu Baskin"
              width={24}
              height={24}
              style={{ objectFit: "contain" }}
            />
            <Typography variant="caption" fontWeight={700} sx={{ color: "rgba(255,255,255,0.7)" }}>
              Karibu Baskin
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0 }}>
            <IconButton
              component="a"
              href="https://www.instagram.com/karibubaskin"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "rgba(255,255,255,0.5)", "&:hover": { color: "#E1306C" }, p: 0.5 }}
              aria-label="Instagram"
            >
              <InstagramIcon sx={{ fontSize: 17 }} />
            </IconButton>
            <IconButton
              component="a"
              href="https://www.facebook.com/karibubaskin"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "rgba(255,255,255,0.5)", "&:hover": { color: "#1877F2" }, p: 0.5 }}
              aria-label="Facebook"
            >
              <FacebookIcon sx={{ fontSize: 17 }} />
            </IconButton>
            <IconButton
              component="a"
              href="https://youtube.com/@karibubaskin"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "rgba(255,255,255,0.5)", "&:hover": { color: "#FF0000" }, p: 0.5 }}
              aria-label="YouTube"
            >
              <YouTubeIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            pt: 0.75,
          }}
        >
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
            © {year} Karibu Baskin
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Link
              href="/sponsor"
              style={{
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.75)",
                textDecoration: "underline",
                textDecorationColor: "rgba(255,255,255,0.35)",
                padding: "4px 0",
              }}
            >
              Sponsor
            </Link>
            <Link
              href="/privacy"
              style={{
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.75)",
                textDecoration: "underline",
                textDecorationColor: "rgba(255,255,255,0.35)",
                padding: "4px 0",
              }}
            >
              {t("privacyPolicy")}
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
