"use client";
import Image from "next/image";
import { Box, Typography, Button, Container, Link as MuiLink } from "@mui/material";
import { TRY_IT_HREF } from "@/lib/clubVenue";
import { alpha } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { heroText } from "@/lib/heroStyles";

function scrollToAllenamenti() {
  document.getElementById("allenamenti")?.scrollIntoView({ behavior: "smooth" });
}

// Altezza della sfumatura sopra il testo: da qui in giu' la velatura e' piena.
const SCRIM_FADE_PX = 96;
// Hero bassa, con il solo saluto: sfumatura piu' corta, per coprire meno foto.
const SCRIM_FADE_COMPACT_PX = 64;
// Velatura dietro al testo. Regge la soglia AA qualunque sia la foto: anche
// sopra un punto bianco (dietro al testo ce ne sono: striscione a terra, righe
// del campo) il fondo risulta #474747, 9,3:1 con il titolo bianco e 7:1 con
// il sottotitolo (`heroText.secondary`). Il minimo sarebbe 0,61, ma il testo
// sta sopra le maglie arancioni e con meno velo si legge peggio.
const SCRIM_ALPHA = 0.72;

interface HeroSectionProps {
  /**
   * Visitatore senza accesso (UX-15): la CTA porta a "Vieni a provare". Senza,
   * e' lo staff che non gioca: la CTA scorre agli allenamenti.
   */
  visitor?: boolean;
  /**
   * Tesserati e account in attesa (UX-33): hero un po' piu' bassa, con il saluto
   * sopra il nome del club, senza sottotitolo ne' bottoni. La CTA e' la card che sale sopra il
   * bordo basso dell'hero (`heroOverlapSx`), e cosi' si vede senza scorrere.
   */
  greeting?: string;
}

/**
 * Hero con foto della home (UX-33). La foto della squadra resta scoperta in
 * alto; il testo sta in basso a sinistra, sopra una velatura che parte solo li'.
 */
export default function HeroSection({ visitor = false, greeting }: HeroSectionProps) {
  const t = useTranslations("home");
  const compact = greeting !== undefined;
  const fade = compact ? SCRIM_FADE_COMPACT_PX : SCRIM_FADE_PX;
  return (
    <Box
      sx={{
        position: "relative",
        // Non a tutta altezza: cosi' il bordo della sezione sotto si intravede
        // senza scorrere, e l'indicatore "scorri" non serve piu'.
        // Su telefono un po' meno: il bottone della card resta sopra la barra in basso.
        minHeight: compact ? { xs: "60svh", md: "62vh" } : { xs: "82svh", md: "80vh" },
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
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

      {/* ── Contenuto, con la sua velatura ── */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          // Il testo comincia dove la sfumatura e' finita: dietro ha sempre la
          // velatura piena.
          pt: `${fade + 8}px`,
          // Con il saluto: sotto resta lo spazio che la card sovrapposta copre.
          pb: compact ? { xs: 10, md: 14 } : { xs: 4, md: 6 },
          background: (theme) => {
            const black = theme.palette.common.black;
            return `linear-gradient(to bottom, ${alpha(black, 0)} 0, ${alpha(black, SCRIM_ALPHA)} ${fade}px, ${alpha(black, SCRIM_ALPHA + 0.1)} 100%)`;
          },
        }}
      >
        <Container maxWidth="lg">
          <Box>
            {greeting && (
              <Typography
                sx={{
                  color: heroText.primary,
                  fontWeight: FONT_WEIGHT.semibold,
                  fontSize: { xs: TYPE_SCALE.lg, md: TYPE_SCALE.xl },
                  mb: 0.5,
                }}
              >
                {greeting}
              </Typography>
            )}

            {/* Il nome del club: chi entra nel sito si aspetta di leggerlo
                (scelta del committente, 01/10/2026). In basso a sinistra e non
                piu' al centro a 96 px, dove copriva le facce: qui sta sopra la
                velatura e "Baskin" arancione non finisce sulle maglie arancioni.
                Lo spazio fra i due span serve al testo accessibile. */}
            <Typography
              component="h1"
              sx={{
                color: heroText.primary,
                fontWeight: FONT_WEIGHT.bold,
                fontSize: { xs: TYPE_SCALE.xl5, sm: TYPE_SCALE.xl6, md: TYPE_SCALE.xl7 },
                lineHeight: 1,
                letterSpacing: "-0.03em",
                mb: compact ? 0 : { xs: 1.25, md: 1.5 },
              }}
            >
              Karibu{" "}
              <Box
                component="span"
                // "Baskin" arancione e' il logotipo (eccezione di marchio, UX-29).
                sx={{ color: "primary.main" }}
              >
                Baskin
              </Box>
            </Typography>

            {!compact && (
              <>
                {/* Cosa siamo e dove, subito sotto il nome. */}
                <Typography
                  sx={{
                    color: heroText.primary,
                    fontWeight: FONT_WEIGHT.semibold,
                    fontSize: { xs: TYPE_SCALE.lg, md: TYPE_SCALE.xl },
                    lineHeight: 1.3,
                    textWrap: "balance",
                    mb: 0.5,
                  }}
                >
                  {t("heroTitle")}
                </Typography>
                <Typography
                  sx={{
                    color: heroText.secondary,
                    fontSize: { xs: TYPE_SCALE.md, md: TYPE_SCALE.lg },
                    lineHeight: 1.6,
                    // Niente parola sola sull'ultima riga.
                    textWrap: "balance",
                    maxWidth: 560,
                  }}
                >
                  {t("heroSubtitle")}
                </Typography>
              </>
            )}
          </Box>

          {!compact && <HeroActions visitor={visitor} />}
        </Container>
      </Box>
    </Box>
  );
}

/** Inviti dell'hero piena: una sola CTA piena, piu' un link di testo. */
function HeroActions({ visitor }: { visitor: boolean }) {
  const t = useTranslations("home");
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        columnGap: 3,
        rowGap: 1,
        flexWrap: "wrap",
        mt: 3,
        color: heroText.primary,
      }}
    >
      <Button
        {...(visitor ? { href: TRY_IT_HREF } : { onClick: scrollToAllenamenti })}
        variant="contained"
        size="large"
        sx={{ px: 3.5 }}
      >
        {visitor ? t("heroTryCta") : t("upcomingTrainings")}
      </Button>
      <MuiLink
        href="/il-baskin"
        color="inherit"
        underline="always"
        sx={{
          // Area di tocco alta quanto il bottone accanto.
          display: "inline-flex",
          alignItems: "center",
          minHeight: 48,
          fontWeight: FONT_WEIGHT.semibold,
          textDecorationColor: "currentcolor",
        }}
      >
        {t("whatIsBaskin")}
      </MuiLink>
    </Box>
  );
}
