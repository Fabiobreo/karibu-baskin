"use client";
import Image from "next/image";
import { Box, Typography, Button, Container, Link as MuiLink } from "@mui/material";
import { TRY_IT_HREF } from "@/lib/clubVenue";
import { alpha } from "@mui/material/styles";
import { visuallyHidden } from "@mui/utils";
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
   * Tesserati e account in attesa (UX-33): hero un po' piu' bassa, con il solo
   * saluto, senza sottotitolo ne' bottoni. La CTA e' la card che sale sopra il
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
            {/* Titolo di contenuto: sport e luogo. Il nome del club si vede
                gia' nell'header, e la scritta grande copriva la foto: qui resta
                solo per chi usa uno screen reader, che altrimenti sentirebbe un
                titolo di pagina senza il nome della squadra. */}
            <Typography
              component="h1"
              sx={{
                // `relative`: il testo nascosto resta dentro il titolo (UX-20).
                position: "relative",
                color: heroText.primary,
                fontWeight: FONT_WEIGHT.bold,
                fontSize: compact
                  ? { xs: TYPE_SCALE.xl3, md: TYPE_SCALE.xl5 }
                  : { xs: TYPE_SCALE.xl4, sm: TYPE_SCALE.xl5, md: TYPE_SCALE.xl6 },
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                textWrap: "balance",
                // Su desktop sta in una riga: il blocco di testo resta basso e
                // copre la foto il meno possibile.
                mb: compact ? 0 : { xs: 1.5, md: 2 },
              }}
            >
              {!compact && (
                <Box component="span" sx={visuallyHidden}>
                  Karibu Baskin:{" "}
                </Box>
              )}
              {greeting ?? t("heroTitle")}
            </Typography>

            {!compact && (
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
