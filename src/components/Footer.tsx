import { Box, Typography, IconButton, Divider } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        background: "linear-gradient(135deg, #1A1A1A 0%, #2D1A0A 100%)",
        color: "rgba(255,255,255,0.85)",
        py: 1,
        px: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: 900,
          mx: "auto",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
          justifyContent: { xs: "center", sm: "space-between" },
        }}
      >
        {/* Logo + nome */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Image src="/logo.png" alt="Karibu Baskin" width={28} height={28} style={{ objectFit: "contain" }} />
          <Typography variant="caption" fontWeight={700} sx={{ color: "rgba(255,255,255,0.75)", letterSpacing: "0.03em" }}>
            Karibu Baskin
          </Typography>
        </Box>

        {/* Social */}
        <Box sx={{ display: "flex", gap: 0 }}>
          <IconButton
            component="a"
            href="https://www.instagram.com/karibubaskin"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "rgba(255,255,255,0.5)", "&:hover": { color: "#E1306C" }, p: 0.5 }}
            aria-label="Instagram"
          >
            <InstagramIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            component="a"
            href="https://www.facebook.com/karibu.baskin"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "rgba(255,255,255,0.5)", "&:hover": { color: "#1877F2" }, p: 0.5 }}
            aria-label="Facebook"
          >
            <FacebookIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            component="a"
            href="https://youtube.com/@karibubaskin"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "rgba(255,255,255,0.5)", "&:hover": { color: "#FF0000" }, p: 0.5 }}
            aria-label="YouTube"
          >
            <YouTubeIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Copyright */}
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.68rem" }}>
          © {year} Karibu Baskin · Montecchio Maggiore
        </Typography>
      </Box>
    </Box>
  );
}
