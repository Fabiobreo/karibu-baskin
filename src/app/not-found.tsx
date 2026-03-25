import { Box, Typography, Button } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pagina non trovata | Karibu Baskin" };

export default function NotFound() {
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
      }}
    >
      <Image
        src="/logo.png"
        alt="Karibu Baskin"
        width={100}
        height={100}
        style={{ objectFit: "contain", marginBottom: 24 }}
      />

      <Typography
        variant="h1"
        sx={{ fontWeight: 900, fontSize: { xs: "5rem", md: "8rem" }, color: "primary.main", lineHeight: 1 }}
      >
        404
      </Typography>

      <Typography variant="h5" fontWeight={700} sx={{ mt: 1, mb: 1 }}>
        La volpe si è persa!
      </Typography>

      <Typography sx={{ color: "rgba(255,255,255,0.5)", mb: 4, maxWidth: 360 }}>
        La pagina che stai cercando non esiste o è stata spostata.
      </Typography>

      <Link href="/" style={{ textDecoration: "none" }}>
        <Button variant="contained" size="large" sx={{ borderRadius: 3, px: 4 }}>
          Torna agli allenamenti
        </Button>
      </Link>
    </Box>
  );
}
