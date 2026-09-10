"use client";
import Image from "next/image";
import { Box, Typography, Button, Container } from "@mui/material";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { useTranslations } from "next-intl";

function scrollToAllenamenti() {
  document.getElementById("allenamenti")?.scrollIntoView({ behavior: "smooth" });
}

export default function HeroSection() {
  const t = useTranslations("home");
  return (
    <Box
      sx={{
        position: "relative",
        // Non a tutta altezza: cosi' il bordo della sezione sotto si intravede
        // senza scorrere, e l'indicatore "scorri" non serve piu'.
        minHeight: { xs: "82svh", md: "80vh" },
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
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.72) 100%)",
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
        {/* Titolo: un solo h1 che contiene marchio, disciplina e luogo.
            Prima l'h1 era la sola parola "Karibu" e "Baskin" stava in un div
            accanto: il segnale più forte che la pagina dà sul proprio
            argomento non conteneva né lo sport né il territorio, e uno screen
            reader annunciava come titolo una parola sola. Il trattamento su
            due righe resta identico; la coda descrittiva è solo per chi non
            vede, ed è vera (ripete il sottotitolo), non testo nascosto per i
            motori. Gli spazi tra gli span servono al testo accessibile: nei
            flex item non si vedono, ma senza si leggerebbe "KaribuBaskin". */}
        <Typography
          component="h1"
          sx={{
            fontWeight: 900,
            fontSize: { xs: "3.8rem", sm: "5rem", md: "6.5rem" },
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            mb: 3.5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box
            component="span"
            sx={{ color: "common.white", textShadow: "0 2px 24px rgba(0,0,0,0.5)" }}
          >
            Karibu
          </Box>{" "}
          <Box
            component="span"
            sx={{
              color: "primary.main",
              textShadow: (theme) => `0 2px 32px ${alpha(theme.palette.primary.main, 0.5)}`,
            }}
          >
            Baskin
          </Box>{" "}
          <Box
            component="span"
            sx={{
              position: "absolute",
              width: "1px",
              height: "1px",
              margin: "-1px",
              padding: 0,
              border: 0,
              overflow: "hidden",
              clipPath: "inset(50%)",
              whiteSpace: "nowrap",
            }}
          >
            {t("heroTitleTail")}
          </Box>
        </Typography>

        {/* Sottotitolo */}
        <Typography
          sx={{
            color: "rgba(255,255,255,0.78)",
            fontWeight: 400,
            fontSize: { xs: "1rem", md: "1.15rem" },
            lineHeight: 1.65,
            mb: 5,
            maxWidth: 480,
            textShadow: "0 1px 8px rgba(0,0,0,0.4)",
          }}
        >
          {t("heroSubtitle")}
        </Typography>

        {/* CTA */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
          <Button
            onClick={scrollToAllenamenti}
            variant="contained"
            size="large"
            sx={{
              fontWeight: 700,
              px: 3.5,
              py: 1.4,
              fontSize: "0.95rem",
              borderRadius: 2,
              boxShadow: (theme) => `0 4px 22px ${alpha(theme.palette.primary.main, 0.55)}`,
              "&:hover": {
                boxShadow: (theme) => `0 6px 28px ${alpha(theme.palette.primary.main, 0.7)}`,
              },
            }}
          >
            {t("upcomingTrainings")}
          </Button>
          <Link href="/il-baskin" style={{ textDecoration: "none" }}>
            <Button
              variant="outlined"
              size="large"
              sx={{
                fontWeight: 600,
                px: 3,
                py: 1.4,
                fontSize: "0.95rem",
                borderRadius: 2,
                color: "common.white",
                borderColor: "rgba(255,255,255,0.35)",
                backdropFilter: "blur(4px)",
                bgcolor: "rgba(255,255,255,0.06)",
                "&:hover": {
                  borderColor: "rgba(255,255,255,0.65)",
                  bgcolor: "rgba(255,255,255,0.12)",
                },
              }}
            >
              {t("whatIsBaskin")}
            </Button>
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
