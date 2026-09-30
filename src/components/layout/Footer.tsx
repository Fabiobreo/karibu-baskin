import { Box, Typography, IconButton, Divider } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import YouTubeIcon from "@mui/icons-material/YouTube";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { heroGradient, heroText, socialBrandColor } from "@/lib/heroStyles";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { TYPE_SCALE } from "@/lib/typeScale";

export default async function Footer() {
  const t = await getTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        display: { xs: "none", md: "block" },
        background: heroGradient.footer,
        color: heroText.secondary,
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
            <Typography component="div" variant="subtitle1" sx={{ lineHeight: 1.2 }}>
              Karibu Baskin
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: heroText.muted,
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
              sx={{
                color: heroText.muted,
                "&:hover": { color: socialBrandColor.instagram },
                p: 0.75,
              }}
              aria-label="Instagram"
            >
              <InstagramIcon fontSize="small" />
            </IconButton>
            <IconButton
              component="a"
              href="https://www.facebook.com/karibubaskin"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: heroText.muted,
                "&:hover": { color: socialBrandColor.facebook },
                p: 0.75,
              }}
              aria-label="Facebook"
            >
              <FacebookIcon fontSize="small" />
            </IconButton>
            <IconButton
              component="a"
              href="https://youtube.com/@karibubaskin"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: heroText.muted,
                "&:hover": { color: socialBrandColor.youtube },
                p: 0.75,
              }}
              aria-label="YouTube"
            >
              <YouTubeIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Divider sx={{ width: "100%", borderColor: heroText.line }} />
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: heroText.muted }}>
            © {year} Karibu Baskin Montecchio Maggiore
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Link
              href="/sponsor"
              style={{
                fontSize: TYPE_SCALE.xs,
                color: heroText.secondary,
                textDecorationColor: heroText.lineStrong,
              }}
            >
              Sponsor
            </Link>
            <Link
              href="/privacy"
              style={{
                fontSize: TYPE_SCALE.xs,
                color: heroText.secondary,
                textDecorationColor: heroText.lineStrong,
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
            <Typography
              variant="caption"
              fontWeight={FONT_WEIGHT.semibold}
              sx={{ color: heroText.secondary }}
            >
              Karibu Baskin
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0 }}>
            <IconButton
              component="a"
              href="https://www.instagram.com/karibubaskin"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: heroText.muted,
                "&:hover": { color: socialBrandColor.instagram },
                p: 0.5,
              }}
              aria-label="Instagram"
            >
              <InstagramIcon sx={{ fontSize: 17 }} />
            </IconButton>
            <IconButton
              component="a"
              href="https://www.facebook.com/karibubaskin"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: heroText.muted,
                "&:hover": { color: socialBrandColor.facebook },
                p: 0.5,
              }}
              aria-label="Facebook"
            >
              <FacebookIcon sx={{ fontSize: 17 }} />
            </IconButton>
            <IconButton
              component="a"
              href="https://youtube.com/@karibubaskin"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: heroText.muted,
                "&:hover": { color: socialBrandColor.youtube },
                p: 0.5,
              }}
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
            borderTop: `1px solid ${heroText.line}`,
            pt: 0.75,
          }}
        >
          <Typography variant="caption" sx={{ color: heroText.muted }}>
            © {year} Karibu Baskin
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Link
              href="/sponsor"
              style={{
                fontSize: TYPE_SCALE.sm,
                color: heroText.secondary,
                textDecoration: "underline",
                textDecorationColor: heroText.lineStrong,
                padding: "4px 0",
              }}
            >
              Sponsor
            </Link>
            <Link
              href="/privacy"
              style={{
                fontSize: TYPE_SCALE.sm,
                color: heroText.secondary,
                textDecoration: "underline",
                textDecorationColor: heroText.lineStrong,
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
