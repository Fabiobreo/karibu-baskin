import { Box, Chip, Container, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { heroGradient } from "@/lib/heroStyles";
import type { ContainerProps } from "@mui/material";

interface PageHeroProps {
  title?: string;
  chip?: string;
  chipWhite?: boolean;
  subtitle?: string;
  subtitleMaxWidth?: number;
  breadcrumb?: React.ReactNode;
  py?: { xs: number; md: number };
  maxWidth?: ContainerProps["maxWidth"];
  decorativeCircles?: boolean;
  align?: "center" | "left";
  children?: React.ReactNode;
}

export default function PageHero({
  title,
  chip,
  chipWhite = false,
  subtitle,
  subtitleMaxWidth = 560,
  breadcrumb,
  py = { xs: 6, md: 9 },
  maxWidth = "md",
  decorativeCircles = true,
  align = "center",
  children,
}: PageHeroProps) {
  return (
    <Box
      style={{ backgroundImage: heroGradient.dark }}
      sx={{
        color: "#fff",
        py,
        px: 2,
        textAlign: align === "center" ? "center" : undefined,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {decorativeCircles && (
        <>
          <Box
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
        </>
      )}
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
            {chip &&
              (chipWhite ? (
                <Chip
                  label={chip}
                  size="small"
                  sx={{
                    mb: 2,
                    fontWeight: 700,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.8)",
                  }}
                />
              ) : (
                <Chip label={chip} color="primary" size="small" sx={{ mb: 2, fontWeight: 700 }} />
              ))}
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
