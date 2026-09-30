"use client";
import Image from "next/image";
import { Box, Typography, Button, Container } from "@mui/material";
import { TRY_IT_HREF } from "@/lib/clubVenue";
import { alpha } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

function scrollToAllenamenti() {
  document.getElementById("allenamenti")?.scrollIntoView({ behavior: "smooth" });
}

interface HeroSectionProps {
  /**
   * Account in attesa di conferma (GUEST): hero più bassa, così la card "I tuoi
   * primi passi" che la sormonta si vede senza scorrere, saluto per nome e CTA
   * su quello che si può fare subito. `null` = nome non disponibile.
   */
  guest?: { firstName: string | null };
  /**
   * Visitatore senza accesso (UX-15): la CTA principale porta a "Vieni a
   * provare" invece che alla lista degli allenamenti.
   */
  visitor?: boolean;
  /**
   * Tesserato (UX-16): hero compatta come per gli ospiti, cosi' la card "La tua
   * prossima cosa da fare" che la sormonta si vede senza scorrere.
   */
  member?: { firstName: string | null };
}

export default function HeroSection({ guest, visitor = false, member }: HeroSectionProps) {
  // Hero bassa quando sopra c'e' una card da far vedere subito.
  const compact = !!guest || !!member;
  const t = useTranslations("home");
  const tGuest = useTranslations("guestOnboarding");
  return (
    <Box
      sx={{
        position: "relative",
        // Non a tutta altezza: cosi' il bordo della sezione sotto si intravede
        // senza scorrere, e l'indicatore "scorri" non serve piu'.
        minHeight: compact ? { xs: "64svh", md: "62vh" } : { xs: "82svh", md: "80vh" },
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
          // Con la card sovrapposta serve spazio sotto le CTA.
          pt: { xs: 8, md: 12 },
          pb: compact ? { xs: 12, md: 16 } : { xs: 8, md: 12 },
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
        {(guest || member?.firstName) && (
          <Typography
            sx={{
              color: "common.white",
              fontWeight: FONT_WEIGHT.semibold,
              fontSize: { xs: TYPE_SCALE.lg, md: TYPE_SCALE.xl },
              mb: 1.5,
              textShadow: "0 1px 8px rgba(0,0,0,0.5)",
            }}
          >
            {guest
              ? guest.firstName
                ? tGuest("heroGreeting", { name: guest.firstName })
                : tGuest("heroGreetingNoName")
              : t("heroHello", { name: member?.firstName ?? "" })}
          </Typography>
        )}
        <Typography
          component="h1"
          sx={{
            fontWeight: FONT_WEIGHT.bold,
            fontSize: guest
              ? { xs: TYPE_SCALE.xl6, sm: TYPE_SCALE.xl7, md: TYPE_SCALE.xl8 }
              : { xs: TYPE_SCALE.xl7, sm: TYPE_SCALE.xl8, md: TYPE_SCALE.xl9 },
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            mb: compact ? 2.5 : 3.5,
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
            fontSize: { xs: TYPE_SCALE.md, md: TYPE_SCALE.lg },
            lineHeight: 1.65,
            mb: compact ? 4 : 5,
            maxWidth: 480,
            textShadow: "0 1px 8px rgba(0,0,0,0.4)",
          }}
        >
          {guest ? tGuest("heroSubtitle") : t("heroSubtitle")}
        </Typography>

        {/* CTA */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            justifyContent: "center",
            color: "common.white",
          }}
        >
          <Button
            {...(visitor ? { href: TRY_IT_HREF } : { onClick: scrollToAllenamenti })}
            variant="contained"
            size="large"
            sx={{ px: 3.5 }}
          >
            {guest
              ? tGuest("heroCtaTrainings")
              : visitor
                ? t("heroTryCta")
                : t("upcomingTrainings")}
          </Button>
          <Button
            href={guest ? "/profilo/ruolo" : "/il-baskin"}
            // Bottone fantasma del tema (UX-30): outlined + color inherit.
            variant="outlined"
            color="inherit"
            size="large"
            sx={{ px: 3 }}
          >
            {guest ? tGuest("heroCtaRole") : t("whatIsBaskin")}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
