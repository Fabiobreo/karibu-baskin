import { Box, Chip, Container, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { brandColor, heroBottomBorder, heroTint } from "@/lib/heroStyles";
import type { ContainerProps } from "@mui/material";

interface EntityHeroProps {
  color: string;
  title: string;
  chip?: string;
  subtitle?: string;
  breadcrumb?: React.ReactNode;
  /** Azione opzionale ancorata in alto a destra (es. pulsante modifica). */
  action?: React.ReactNode;
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
  action,
  py = { xs: 5, md: 7 },
  maxWidth = "md",
  children,
}: EntityHeroProps) {
  return (
    <Box
      style={{
        backgroundImage: heroTint(color),
      }}
      sx={{
        ...heroBottomBorder,
        color: "common.white",
        py,
        px: 2,
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
          }}
        >
          {breadcrumb}
        </Box>
      )}

      {action && (
        <Box
          sx={{
            position: "absolute",
            top: { xs: 12, md: 16 },
            right: { xs: 12, md: 20 },
            zIndex: 3,
          }}
        >
          {action}
        </Box>
      )}

      <Container maxWidth={maxWidth} sx={{ position: "relative", zIndex: 1 }}>
        {chip && (
          <Chip
            label={chip}
            size="small"
            sx={{
              mb: 1.5,
              backgroundColor: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.85)",
            }}
          />
        )}
        {children ? (
          children
        ) : (
          <>
            <Typography variant="h3" component="h1" sx={{ lineHeight: 1.1, mb: 1 }}>
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
