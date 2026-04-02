"use client";
import Image from "next/image";
import { Box, Typography, Button, Container } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import Link from "next/link";

export default function HeroSection() {
  return (
    <Box
      sx={{
        position: "relative",
        minHeight: { xs: "92svh", md: "88vh" },
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* ── Foto di sfondo ── */}
      <Image
        src="/hero.jpg"
        alt="Squadra Karibu Baskin"
        fill
        priority
        style={{ objectFit: "cover", objectPosition: "center" }}
        sizes="100vw"
      />

      {/* ── Overlay gradiente scuro ── */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.72) 100%)",
        }}
      />

      {/* ── Contenuto ── */}
      <Container
        maxWidth="md"
        sx={{
          position: "relative",
          zIndex: 1,
          py: { xs: 8, md: 12 },
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Etichetta */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <Box sx={{ width: 28, height: 2.5, bgcolor: "primary.main", borderRadius: 2 }} />
          <Typography sx={{
            color: "primary.main", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "0.68rem",
          }}>
            Montecchio Maggiore · Vicenza
          </Typography>
          <Box sx={{ width: 28, height: 2.5, bgcolor: "primary.main", borderRadius: 2 }} />
        </Box>

        {/* Titolo */}
        <Typography
          component="h1"
          sx={{
            fontWeight: 900,
            fontSize: { xs: "3.8rem", sm: "5rem", md: "6.5rem" },
            lineHeight: 0.95,
            color: "#fff",
            letterSpacing: "-0.03em",
            textShadow: "0 2px 24px rgba(0,0,0,0.5)",
          }}
        >
          Karibu
        </Typography>
        <Typography
          component="div"
          sx={{
            fontWeight: 900,
            fontSize: { xs: "3.8rem", sm: "5rem", md: "6.5rem" },
            lineHeight: 0.95,
            color: "primary.main",
            letterSpacing: "-0.03em",
            mb: 3.5,
            textShadow: "0 2px 32px rgba(230,81,0,0.5)",
          }}
        >
          Baskin
        </Typography>

        {/* Sottotitolo */}
        <Typography sx={{
          color: "rgba(255,255,255,0.78)",
          fontWeight: 400,
          fontSize: { xs: "1rem", md: "1.15rem" },
          lineHeight: 1.65,
          mb: 5,
          maxWidth: 480,
          textShadow: "0 1px 8px rgba(0,0,0,0.4)",
        }}>
          Sport inclusivo per tutti. Alleniamoci insieme, senza distinzioni.
        </Typography>

        {/* CTA */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
          <Button
            component="a"
            href="#allenamenti"
            variant="contained"
            size="large"
            sx={{
              fontWeight: 700, px: 3.5, py: 1.4,
              fontSize: "0.95rem", borderRadius: 2,
              boxShadow: "0 4px 22px rgba(230,81,0,0.55)",
              "&:hover": { boxShadow: "0 6px 28px rgba(230,81,0,0.7)" },
            }}
          >
            Prossimi allenamenti
          </Button>
          <Link href="/il-baskin" style={{ textDecoration: "none" }}>
            <Button
              variant="outlined"
              size="large"
              sx={{
                fontWeight: 600, px: 3, py: 1.4,
                fontSize: "0.95rem", borderRadius: 2,
                color: "#fff",
                borderColor: "rgba(255,255,255,0.35)",
                backdropFilter: "blur(4px)",
                bgcolor: "rgba(255,255,255,0.06)",
                "&:hover": {
                  borderColor: "rgba(255,255,255,0.65)",
                  bgcolor: "rgba(255,255,255,0.12)",
                },
              }}
            >
              Cos&apos;è il Baskin?
            </Button>
          </Link>
        </Box>
      </Container>

      {/* Freccia scroll */}
      <Box
        component="a"
        href="#allenamenti"
        sx={{
          position: "absolute", bottom: 24, left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column", alignItems: "center", gap: 0.5,
          color: "rgba(255,255,255,0.3)",
          textDecoration: "none",
          transition: "color 0.2s",
          "&:hover": { color: "rgba(255,255,255,0.65)" },
          zIndex: 1,
        }}
      >
        <Typography sx={{ letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "0.58rem" }}>
          Scorri
        </Typography>
        <KeyboardArrowDownIcon fontSize="small" />
      </Box>
    </Box>
  );
}
