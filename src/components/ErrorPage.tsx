"use client";
import { Box, Typography, Button, Stack } from "@mui/material";
import Image from "next/image";
import Link from "next/link";

interface Props {
  code?: string | number;
  title: string;
  description: string;
  showReset?: boolean;
  onReset?: () => void;
  digest?: string;
}

export default function ErrorPage({ code, title, description, showReset, onReset, digest }: Props) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        px: 3,
        background: "linear-gradient(150deg, #1A1A1A 0%, #2D1A0A 60%, #3D2010 100%)",
        color: "#fff",
        gap: 0,
      }}
    >
      {/* Logo */}
      <Image
        src="/logo.png"
        alt="Karibu Baskin"
        width={80}
        height={80}
        style={{ objectFit: "contain", opacity: 0.85 }}
      />

      {/* Codice errore */}
      {code && (
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: "6rem", md: "9rem" },
            color: "primary.main",
            lineHeight: 1,
            mt: 2,
            mb: 0,
            letterSpacing: "-4px",
            textShadow: "0 0 60px rgba(230,81,0,0.3)",
          }}
        >
          {code}
        </Typography>
      )}

      {/* Titolo */}
      <Typography
        variant="h5"
        fontWeight={800}
        sx={{ mt: code ? 1 : 3, mb: 1.5, fontSize: { xs: "1.2rem", md: "1.5rem" } }}
      >
        {title}
      </Typography>

      {/* Descrizione */}
      <Typography
        sx={{
          color: "rgba(255,255,255,0.45)",
          mb: 4,
          maxWidth: 380,
          lineHeight: 1.7,
          fontSize: "0.95rem",
        }}
      >
        {description}
      </Typography>

      {/* Digest — codice di riferimento per supporto */}
      {digest && (
        <Typography
          sx={{
            color: "rgba(255,255,255,0.25)",
            fontSize: "0.72rem",
            fontFamily: "monospace",
            mb: 2,
            mt: -2,
          }}
        >
          ref: {digest}
        </Typography>
      )}

      {/* Azioni */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        {showReset && onReset && (
          <Button
            variant="contained"
            size="large"
            onClick={onReset}
            sx={{ borderRadius: 3, px: 4, fontWeight: 700 }}
          >
            Riprova
          </Button>
        )}
        <Link href="/" style={{ textDecoration: "none" }}>
          <Button
            variant={showReset ? "outlined" : "contained"}
            size="large"
            sx={{
              borderRadius: 3,
              px: 4,
              fontWeight: 700,
              ...(showReset && {
                color: "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.2)",
                "&:hover": { borderColor: "rgba(255,255,255,0.5)" },
              }),
            }}
          >
            Torna agli allenamenti
          </Button>
        </Link>
      </Stack>

      {/* Linea decorativa in fondo */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, transparent, #E65100, transparent)",
          opacity: 0.6,
        }}
      />
    </Box>
  );
}
