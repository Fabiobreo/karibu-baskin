import { Box, Chip, Container, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ContainerProps } from "@mui/material";

interface EntityHeroProps {
  color: string;
  title: string;
  chip?: string;
  subtitle?: string;
  breadcrumb?: React.ReactNode;
  py?: { xs: number; md: number };
  maxWidth?: ContainerProps["maxWidth"];
  children?: React.ReactNode;
}

export default function EntityHero({
  color,
  title,
  chip,
  subtitle,
  breadcrumb,
  py = { xs: 5, md: 7 },
  maxWidth = "md",
  children,
}: EntityHeroProps) {
  return (
    <Box
      style={{
        backgroundImage: `linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, ${color} 130%)`,
      }}
      sx={{
        color: "#fff",
        py,
        px: 2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sfere decorative */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: "50%",
          backgroundColor: alpha("#E65100", 0.1),
          pointerEvents: "none",
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          bottom: -80,
          left: -80,
          width: 320,
          height: 320,
          borderRadius: "50%",
          backgroundColor: alpha("#E65100", 0.06),
          pointerEvents: "none",
        }}
      />

      {breadcrumb && (
        <Box
          sx={{
            position: "absolute",
            top: { xs: 12, md: 16 },
            left: { xs: 12, md: 20 },
            right: { xs: 60, md: 80 },
            zIndex: 2,
          }}
        >
          {breadcrumb}
        </Box>
      )}

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
