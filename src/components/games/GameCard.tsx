"use client";
import { Box, CardActionArea, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { BRAND, HERO_TEXT } from "@/lib/palette";
import { RADIUS } from "@/lib/radius";

interface GameCardProps {
  /** Dove porta la card; `null` = gioco che aspetta (non si tocca, niente freccia). */
  href: string | null;
  /** Il disegno (`GameArt`), sulla testata grafite. */
  art: React.ReactNode;
  title: string;
  /** Una riga sola: il dato utile a chi guarda. */
  line: string;
  /** La riga è un invito ("Accedi per giocare"): in arancio, come un link. */
  lineIsAction?: boolean;
  /** Gioco dei tesserati visto da chi non lo è: etichetta col lucchetto. */
  lockedLabel?: string;
  /**
   * Gioco spento visto dallo staff: la card sembra spenta (disegno in grigio,
   * freccia neutra), senza scriverlo. Il testo è solo per i lettori di schermo.
   */
  offLabel?: string;
}

/**
 * Card di un gioco in `/giochi` (UX-68): disegno grande, titolo, una riga, una
 * freccia. Tutta la card si tocca; al passaggio prende bordo e freccia arancio.
 * Client Component perché la testata legge il tema; il disegno arriva dal server.
 */
export default function GameCard({
  href,
  art,
  title,
  line,
  lineIsAction = false,
  lockedLabel,
  offLabel,
}: GameCardProps) {
  const off = Boolean(offLabel);
  const content = (
    <>
      <Box
        sx={{
          position: "relative",
          aspectRatio: { xs: "2 / 1", sm: "16 / 10" },
          // In chiaro la testata è il grafite delle fasce (un gradiente), in scuro un grigio.
          background: (theme) => theme.palette.heroGradient.cardHead,
          filter: off ? "grayscale(1)" : undefined,
          opacity: off ? 0.55 : undefined,
        }}
      >
        {art}
        {(lockedLabel || offLabel) && (
          <Box
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              minHeight: 28,
              borderRadius: RADIUS.sm,
              border: "1px solid",
              borderColor: HERO_TEXT.lineStrong,
              bgcolor: BRAND.dark,
              color: HERO_TEXT.primary,
              typography: "caption",
              fontWeight: FONT_WEIGHT.semibold,
            }}
          >
            {lockedLabel ? (
              <>
                <LockIcon sx={{ fontSize: 16 }} aria-hidden />
                {lockedLabel}
              </>
            ) : (
              <>
                <VisibilityOffIcon sx={{ fontSize: 16 }} aria-hidden />
                <Box component="span" sx={visuallyHidden}>
                  {offLabel}
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, pt: 1.75, pb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            component="h2"
            noWrap
            sx={{ color: off ? "text.secondary" : "text.primary" }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            noWrap
            sx={{
              color: lineIsAction ? "primary.onLight" : "text.secondary",
              fontWeight: lineIsAction ? FONT_WEIGHT.semibold : undefined,
            }}
          >
            {line}
          </Typography>
        </Box>
        {href && (
          <Box
            aria-hidden
            className="game-card-arrow"
            sx={{
              flex: "none",
              width: 40,
              height: 40,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              transition: "transform .15s",
              ...(off
                ? { border: "1px solid", borderColor: "divider", color: "text.secondary" }
                : { bgcolor: "primary.main", color: "primary.contrastText" }),
            }}
          >
            <ArrowForwardIcon fontSize="small" />
          </Box>
        )}
      </Box>
    </>
  );

  const frame = {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    height: "100%",
    overflow: "hidden",
    borderRadius: RADIUS.lg,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: "background.paper",
  } as const;

  if (!href) {
    return (
      <Box component="article" sx={frame}>
        {content}
      </Box>
    );
  }
  return (
    <CardActionArea
      href={href}
      sx={{
        ...frame,
        transition: "border-color .15s",
        "& .MuiCardActionArea-focusHighlight": { display: "none" },
        "&:hover, &.Mui-focusVisible": { borderColor: "primary.main" },
        "&.Mui-focusVisible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: "2px",
        },
        "&:hover .game-card-arrow, &.Mui-focusVisible .game-card-arrow": {
          transform: "translateX(3px)",
        },
        "@media (prefers-reduced-motion: reduce)": {
          "& .game-card-arrow": { transition: "none" },
        },
      }}
    >
      {content}
    </CardActionArea>
  );
}
