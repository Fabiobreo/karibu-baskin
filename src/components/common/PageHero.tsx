import { Box, Chip, Container, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { brandColor, heroBottomBorder, heroGradient } from "@/lib/heroStyles";
import type { ContainerProps } from "@mui/material";

interface PageHeroProps {
  title?: string;
  chip?: string;
  subtitle?: string;
  subtitleMaxWidth?: number;
  breadcrumb?: React.ReactNode;
  py?: { xs: number; md: number };
  maxWidth?: ContainerProps["maxWidth"];
  align?: "center" | "left";
  children?: React.ReactNode;
}

export default function PageHero({
  title,
  chip,
  subtitle,
  subtitleMaxWidth = 560,
  breadcrumb,
  py = { xs: 6, md: 9 },
  maxWidth = "md",
  align = "center",
  children,
}: PageHeroProps) {
  return (
    <Box
      style={{ backgroundImage: heroGradient.dark }}
      sx={{
        ...heroBottomBorder,
        color: "common.white",
        py,
        px: 2,
        textAlign: align === "center" ? "center" : undefined,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {breadcrumb && (
        <Box
          sx={{
            position: "absolute",
            top: { xs: 12, md: 16 },
            left: { xs: 12, md: 20 },
            right: { xs: 60, md: 80 },
            zIndex: 2,
            textAlign: "left",
          }}
        >
          {breadcrumb}
        </Box>
      )}
      <Container maxWidth={maxWidth} sx={{ position: "relative", zIndex: 1 }}>
        {title ? (
          <>
            {/* Chip neutro: sopra il titolo informa, non si tocca, quindi
                niente arancio pieno (UX-07: arancio = "qui si agisce"). */}
            {chip && (
              <Chip
                label={chip}
                size="small"
                sx={{
                  mb: 2,
                  fontWeight: 700,
                  backgroundColor: alpha(brandColor.white, 0.12),
                  color: alpha(brandColor.white, 0.85),
                }}
              />
            )}
            <Typography
              variant="h3"
              component="h1"
              fontWeight={800}
              sx={{ mb: subtitle || children ? 2 : 0, fontSize: { xs: "2rem", md: "2.8rem" } }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="h6"
                component="p"
                sx={{
                  color: "rgba(255,255,255,0.75)",
                  fontWeight: 400,
                  maxWidth: align === "center" ? subtitleMaxWidth : undefined,
                  mx: align === "center" ? "auto" : undefined,
                  fontSize: { xs: "1rem", md: "1.1rem" },
                }}
              >
                {subtitle}
              </Typography>
            )}
            {children}
          </>
        ) : (
          children
        )}
      </Container>
    </Box>
  );
}
