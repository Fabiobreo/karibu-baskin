import { Box, Chip, Container, Typography } from "@mui/material";
import type { ContainerProps } from "@mui/material";

interface EntityHeroProps {
  color: string;
  title: string;
  chip?: string;
  subtitle?: string;
  py?: { xs: number; md: number };
  maxWidth?: ContainerProps["maxWidth"];
  children?: React.ReactNode;
}

export default function EntityHero({
  color,
  title,
  chip,
  subtitle,
  py = { xs: 5, md: 7 },
  maxWidth = "md",
  children,
}: EntityHeroProps) {
  return (
    <Box
      sx={{
        background: `linear-gradient(150deg, #1A1A1A 0%, #1A1A1A 30%, ${color} 130%)`,
        color: "#fff",
        py,
        px: 2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative watermark initial */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          top: "50%",
          right: { xs: -40, md: -20 },
          transform: "translateY(-50%)",
          fontSize: { xs: "14rem", md: "20rem" },
          fontWeight: 900,
          color: "#fff",
          opacity: 0.04,
          lineHeight: 1,
          pointerEvents: "none",
          userSelect: "none",
          fontFamily: "inherit",
        }}
      >
        {title[0]?.toUpperCase()}
      </Box>

      <Container maxWidth={maxWidth} sx={{ position: "relative", zIndex: 1 }}>
        {chip && (
          <Chip
            label={chip}
            size="small"
            sx={{
              mb: 1.5,
              fontWeight: 700,
              backgroundColor: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.85)",
            }}
          />
        )}
        {children ? (
          children
        ) : (
          <>
            <Typography
              variant="h3"
              component="h1"
              fontWeight={800}
              sx={{ lineHeight: 1.1, mb: 1 }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.75)", maxWidth: 520 }}>
                {subtitle}
              </Typography>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
