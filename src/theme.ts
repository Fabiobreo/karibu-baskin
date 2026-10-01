"use client";
import { createTheme, type Theme } from "@mui/material/styles";
import { heroGradient } from "@/lib/heroStyles";
import LinkBehavior from "@/components/common/LinkBehavior";
import { TYPE_SCALE } from "@/lib/typeScale";
import { RADIUS, SHAPE_RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import {
  APP_ROLE,
  BIB,
  BRAND,
  FOCUS_RING,
  HERO,
  MEDAL,
  NEUTRAL,
  OUTCOME,
  ROLE_BORDER_DARK,
  SHADOW,
  TEAM,
  WARM_SURFACE,
} from "@/lib/palette";

// Re-export per retro-compatibilità (vedi src/lib/heroStyles.ts per il motivo).
export { heroGradient };

// Colori (UX-29): i valori stanno tutti in `@/lib/palette`, insieme al
// significato di ogni famiglia. Qui si montano sul tema MUI.
const ORANGE = BRAND.orange;
const ORANGE_ON_LIGHT = BRAND.orangeOnLight;
const ORANGE_ON_DARK = BRAND.orangeOnDark;
const ORANGE_FILL = BRAND.orangeFill;
const ORANGE_FILL_HOVER = BRAND.orangeFillHover;

type MatchPalette = {
  win: string;
  winBg: string;
  loss: string;
  lossBg: string;
  draw: string;
  drawBg: string;
  /**
   * Etichetta sopra un riempimento `win`/`draw`/`loss`: bianca in chiaro,
   * scura in scuro, dove i riempimenti sono chiari.
   */
  onFill: string;
};

/** Tinte squadra: stesso hex nei due temi. Si leggono da `@/lib/teamColors`. */
type TeamPalette = Record<keyof typeof TEAM, string>;

/** Casacche d'allenamento: colori veri delle maglie, sempre col nome. */
type BibPalette = Record<keyof typeof BIB, string>;

type MedalPalette = {
  gold: string;
  /** Seconda fermata del gradiente della pastiglia oro. */
  goldDeep: string;
  /**
   * Velatura di fondo per le card traguardo. Sta in palette e non calcolata
   * con `alpha()` perche' i componenti che la usano sono Server Component:
   * una callback dentro `sx` non attraversa il confine RSC.
   */
  goldBg: string;
  silver: string;
  silverDeep: string;
  silverBg: string;
  bronze: string;
  bronzeDeep: string;
  bronzeBg: string;
};

type HeroGradientPalette = {
  dark: string;
  /**
   * Testata delle card degli allenamenti (UX-43): in chiaro il grafite delle
   * fasce, in scuro un grigio piu' chiaro del corpo della card.
   */
  cardHead: string;
  /**
   * Bordo inferiore degli hero (UX-08): trasparente in chiaro, visibile in
   * scuro, dove un hero grafite su #121212 si confonderebbe con la pagina.
   */
  border: string;
};

/** Pesca: superficie di marchio chiara, mai interattiva. Porta sempre il suo bordo. */
type WarmSurfacePalette = {
  bg: string;
  border: string;
};

/** Chip del ruolo utente: fondo tenue e testo della stessa tinta. */
type AppRolePalette = Record<keyof typeof APP_ROLE.light, { bg: string; fg: string }>;

type FocusRingPalette = {
  /** Colore dell'anello esterno. */
  main: string;
  /** Anello interno di contrasto, per staccare il focus dalle superfici chiare. */
  contrast: string;
};

type AppBarPalette = {
  from: string;
  to: string;
};

/**
 * Barra di navigazione del pannello admin (UX-29): neutra. L'arancio resta
 * solo sulla voce selezionata e sul suo indicatore (stato attivo).
 */
type AdminBandPalette = {
  bg: string;
  border: string;
  /** Voci non selezionate. */
  text: string;
  /** Voce selezionata. */
  accent: string;
  /** Sottolineatura della voce selezionata (elemento grafico, soglia 3:1). */
  indicator: string;
  hover: string;
};

type BorderPalette = {
  /** Bordo dei campi dei moduli (WCAG 1.4.11): il default MUI si fermava a 1,6-2,1:1. */
  control: string;
  /** Bordo del badge del ruolo: in scuro i colori dei ruoli stanno a 1,2-2,1:1 dal fondo. */
  role: string;
};

declare module "@mui/material/styles" {
  interface Palette {
    match: MatchPalette;
    team: TeamPalette;
    bib: BibPalette;
    medal: MedalPalette;
    heroGradient: HeroGradientPalette;
    warmSurface: WarmSurfacePalette;
    appRole: AppRolePalette;
    focusRing: FocusRingPalette;
    appBar: AppBarPalette;
    adminBand: AdminBandPalette;
    border: BorderPalette;
  }
  interface PaletteOptions {
    warmSurface?: WarmSurfacePalette;
    appRole?: AppRolePalette;
    match?: MatchPalette;
    team?: TeamPalette;
    bib?: BibPalette;
    medal?: MedalPalette;
    heroGradient?: HeroGradientPalette;
    focusRing?: FocusRingPalette;
    appBar?: AppBarPalette;
    adminBand?: AdminBandPalette;
    border?: BorderPalette;
  }

  interface TypographyVariants {
    stat: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    stat?: React.CSSProperties;
  }

  // `onLight`: arancione da usare per TESTO e link (ORANGE_ON_LIGHT / ORANGE_ON_DARK).
  // `fill`: riempimento arancio sotto un'etichetta bianca (ORANGE_FILL).
  interface PaletteColor {
    onLight: string;
    fill: string;
  }
  interface SimplePaletteColorOptions {
    onLight?: string;
    fill?: string;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    stat: true;
  }
}

const lightFocusRing: FocusRingPalette = {
  main: FOCUS_RING.main,
  contrast: FOCUS_RING.contrastLight,
};
const darkFocusRing: FocusRingPalette = {
  main: FOCUS_RING.main,
  contrast: FOCUS_RING.contrastDark,
};

// L'AppBar resta scuro in entrambi i temi: identita' del club, continuita' con l'hero.
const sharedAppBar: AppBarPalette = { from: BRAND.dark, to: BRAND.darkSoft };

const lightAdminBand: AdminBandPalette = {
  bg: NEUTRAL.light.paper,
  border: NEUTRAL.light.divider,
  text: NEUTRAL.light.text,
  accent: ORANGE_ON_LIGHT,
  indicator: ORANGE,
  hover: NEUTRAL.light.hover,
};

const darkAdminBand: AdminBandPalette = {
  bg: NEUTRAL.dark.paper,
  border: NEUTRAL.dark.divider,
  text: NEUTRAL.dark.text,
  accent: ORANGE_ON_DARK,
  indicator: ORANGE_ON_DARK,
  hover: NEUTRAL.dark.hover,
};

// Esiti = valenza (UX-29): `success`, `warning` ed `error` del tema hanno gli
// stessi valori di vittoria, pareggio e sconfitta. `match.*` resta il nome da
// usare per le partite.
const lightMatch: MatchPalette = {
  win: OUTCOME.light.win,
  winBg: OUTCOME.light.winBg,
  loss: OUTCOME.light.loss,
  lossBg: OUTCOME.light.lossBg,
  draw: OUTCOME.light.draw,
  drawBg: OUTCOME.light.drawBg,
  onFill: OUTCOME.light.onFill,
};

const darkMatch: MatchPalette = {
  win: OUTCOME.dark.win,
  winBg: OUTCOME.dark.winBg,
  loss: OUTCOME.dark.loss,
  lossBg: OUTCOME.dark.lossBg,
  draw: OUTCOME.dark.draw,
  drawBg: OUTCOME.dark.drawBg,
  onFill: OUTCOME.dark.onFill,
};

const sharedTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  // Tre pesi (UX-31): 400 testo, 600 etichette, 800 titoli. I pesi
  // "di sistema" di MUI seguono la stessa scala: `fontWeightMedium` lo usano
  // intestazioni di tabella, tab, badge e titoli degli Alert (prima 500),
  // `fontWeightLight` i vecchi h1-h3 di default (300).
  fontWeightLight: FONT_WEIGHT.regular,
  fontWeightRegular: FONT_WEIGHT.regular,
  fontWeightMedium: FONT_WEIGHT.semibold,
  fontWeightBold: FONT_WEIGHT.bold,
  // Titoli a 800, con un tracking negativo piu' leggero di prima (a 900
  // Inter sembrava compressa): stretto solo dove il corpo e' grande.
  h1: { fontWeight: FONT_WEIGHT.bold, letterSpacing: "-0.02em" },
  h2: { fontWeight: FONT_WEIGHT.bold, letterSpacing: "-0.02em" },
  h3: { fontWeight: FONT_WEIGHT.bold, letterSpacing: "-0.015em" },
  // Titoli di sezione (h2 nelle pagine pubbliche): un gradino netto sotto l'h1
  // delle intestazioni (28/40 px), non 34 come il default MUI (UX-32): 24 px su
  // telefono, 28 da `md` (900 px) in su.
  h4: {
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: "-0.01em",
    fontSize: TYPE_SCALE.xl2,
    "@media (min-width:900px)": { fontSize: TYPE_SCALE.xl3 },
  },
  h5: { fontWeight: FONT_WEIGHT.bold, letterSpacing: "-0.005em" },
  h6: { fontWeight: FONT_WEIGHT.semibold },
  subtitle1: { fontWeight: FONT_WEIGHT.semibold },
  subtitle2: { fontWeight: FONT_WEIGHT.semibold },
  // Scala del testo corrente (UX-10): 14px per il corpo secondario, 12px e'
  // il minimo per qualunque testo (didascalie, meta, chip).
  body2: { fontSize: TYPE_SCALE.sm },
  caption: { fontSize: TYPE_SCALE.xs, lineHeight: 1.5 },
  // Occhiello maiuscoletto sopra i titoli: un solo letterSpacing per tutto il
  // sito (prima sette valori diversi riscritti a mano).
  overline: {
    fontSize: TYPE_SCALE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: "0.08em",
    lineHeight: 1.6,
  },
  // Numeri grandi (tabelloni, punti, statistiche): la dimensione la sceglie
  // chi la usa, qui peso, interlinea e cifre a larghezza fissa.
  stat: {
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.5px",
  },
  button: { fontWeight: FONT_WEIGHT.semibold, letterSpacing: 0 },
} as const;

// Raggio base (UX-30): e' `RADIUS.md`. Lo usano i componenti MUI senza un
// raggio proprio (Alert, menu, tooltip, ToggleButtonGroup...).
const sharedShape = { borderRadius: SHAPE_RADIUS } as const;

// I `components` non sono piu' condivisi fra i due temi: in dark le ombre
// nere sono invisibili sul fondo #121212, quindi l'elevazione delle card passa
// da ombra a bordo. Il resto degli override e' identico.
function buildComponents(mode: "light" | "dark") {
  const isDark = mode === "dark";
  const focusRing = isDark ? darkFocusRing : lightFocusRing;

  // Anello interno di contrasto + anello esterno colorato: cosi' il focus si
  // vede sia sull'AppBar scuro sia sul corpo chiaro, con un colore solo.
  const focusRingStyles = {
    outline: `3px solid ${focusRing.main}`,
    outlineOffset: 2,
    boxShadow: `0 0 0 2px ${focusRing.contrast}`,
  } as const;

  // Variante per la regola globale, che colpisce anche elementi senza raggio
  // proprio (link di testo, elementi con tabIndex). Sui componenti MUI si usa
  // `focusRingStyles`, per non alterarne gli angoli mentre hanno il focus.
  const focusVisibleStyles = { ...focusRingStyles, borderRadius: 4 } as const;

  // Arancione da usare per il TESTO sulle superfici del tema corrente.
  const orangeText = isDark ? ORANGE_ON_DARK : ORANGE_ON_LIGHT;

  const cardShadow = isDark ? SHADOW.cardDark : SHADOW.card;
  const cardHoverShadow = isDark ? SHADOW.cardHoverDark : SHADOW.cardHover;

  return {
    // Griglia unica (UX-37): margini laterali 16 px su telefono, 24 su tablet
    // (default MUI) e 32 da desktop, uguali per header, intestazioni e contenuto.
    MuiContainer: {
      styleOverrides: {
        root: {
          "@media (min-width:900px)": {
            "&:not(.MuiContainer-disableGutters)": { paddingLeft: 32, paddingRight: 32 },
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        ":focus-visible": focusVisibleStyles,
        // L'enfasi dentro un paragrafo e' un'etichetta, non un titolo: 600.
        // CssBaseline le darebbe `fontWeightBold` (800).
        "b, strong": { fontWeight: FONT_WEIGHT.semibold },
        // Rispetta "riduci movimento" del sistema operativo: marquee sponsor,
        // carosello, hover delle card e transizioni si fermano.
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
        },
      },
    },
    // MUI azzera l'outline nativo su ButtonBase e Link (`outline: 0`): senza
    // questi due override la regola globale qui sopra, a parita' di
    // specificita', perderebbe contro le classi dei componenti.
    MuiButtonBase: {
      // `<Button href="/x">` (e IconButton, MenuItem, Tab…) rende `next/link`:
      // un solo elemento, una sola fermata di Tab e navigazione lato client,
      // anche da un Server Component. Esterni, `/api/*` e download restano `<a>`.
      defaultProps: { LinkComponent: LinkBehavior },
      styleOverrides: {
        root: { "&:focus-visible": focusRingStyles },
      },
    },
    MuiLink: {
      // I link testuali senza `color` esplicito prendono l'arancione
      // accessibile invece di `primary.main` (3,79:1 su bianco). Sta nei
      // defaultProps, non negli styleOverrides, cosi' un `color="inherit"`
      // dentro un hero scuro continua a vincere.
      defaultProps: { color: "primary.onLight", component: LinkBehavior },
      styleOverrides: {
        root: { "&:focus-visible": focusRingStyles },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        // Niente anello di focus sui campi: in un campo di testo `:focus-visible`
        // scatta anche al click (per il browser l'input li' e' sempre da
        // tastiera), e l'anello si sommava al bordo del campo a ogni click, con
        // un triplo contorno. Il campo ha gia' il suo indicatore, il bordo a 2px
        // di `.Mui-focused`: gli diamo l'arancione accessibile del tema (5,60:1
        // in chiaro, 7,15:1 in scuro) invece di `primary.main` (3,7:1 in scuro).
        //
        // Fondo pieno, dal tema: trasparente, sul fondo beige della pagina il
        // campo sembrava disattivato accanto alle card bianche, e si vedeva
        // solo per il bordo sottile. Dentro una card non cambia nulla (e' gia'
        // di quel colore); in scuro `paper` stacca il campo da #121212 come
        // fanno le card.
        //
        // Bordo a riposo da `border.control` (UX-29): il default MUI (nero al
        // 23%) si fermava a 1,6-2,1:1, sotto il 3:1 dei componenti (WCAG
        // 1.4.11). In hover prende il colore del testo.
        root: ({ theme }: { theme: Theme }) => ({
          backgroundColor: theme.palette.background.paper,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.border.control },
          "@media (hover: hover)": {
            "&:hover:not(.Mui-disabled):not(.Mui-error):not(.Mui-focused) .MuiOutlinedInput-notchedOutline":
              { borderColor: theme.palette.text.primary },
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: orangeText },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.error.main },
          "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.action.disabled,
          },
        }),
      },
    },
    MuiInputBase: {
      styleOverrides: {
        // L'anello globale `:focus-visible` colpiva l'<input> dentro il campo:
        // un rettangolo nero (l'anello interno di contrasto) dentro il bordo
        // arancione. Il campo segnala il focus col suo bordo, vedi sopra.
        //
        // Sui dispositivi touch il testo del campo sta a 16px: sotto, iOS Safari
        // ingrandisce la pagina da solo al focus. La regola sta sull'<input>,
        // quindi vince sui `fontSize` messi sul contenitore negli `sx` locali;
        // su desktop quei valori restano come sono.
        input: {
          "&:focus-visible": { outline: "none", boxShadow: "none" },
          "@media (pointer: coarse)": { fontSize: 16 },
        },
      },
    },
    MuiAvatar: {
      // La foto dell'Avatar sta sempre accanto al nome della persona (liste,
      // tabelle, bottom nav): e' decorativa, e senza `alt` il lettore di
      // schermo leggeva l'indirizzo dell'immagine. Dove la foto e' l'unico
      // contenuto (es. il menu utente nell'header) si passa un `alt` esplicito.
      defaultProps: { alt: "" },
    },
    MuiButton: {
      // Bottoni piatti (UX-30): niente ombre, tanto meno colorate. L'alone
      // arancione era l'elemento che piu' faceva sembrare il sito un template.
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: RADIUS.md,
          textTransform: "none",
          fontWeight: FONT_WEIGHT.semibold,
          // Due taglie: 40 px (default) e 48 px (`large`: CTA di pagina e invio
          // dei moduli pubblici). `small` resta per le azioni dense (tabelle,
          // admin), mai per l'azione principale.
          minHeight: 40,
          paddingTop: 6,
          paddingBottom: 6,
        },
        sizeSmall: { minHeight: 32, paddingTop: 4, paddingBottom: 4 },
        sizeLarge: { minHeight: 48, paddingTop: 8, paddingBottom: 8 },
        containedPrimary: {
          // Riempimento arancio della maglia, scurito (UX-07): bianco su
          // #C84B00 fa 4,71:1, mentre su #E65100 si fermava a 3,79:1.
          backgroundColor: ORANGE_FILL,
          // `&&` per battere le `variants` di MuiButton, che assegnano
          // primary.dark in hover.
          "@media (hover: hover)": {
            "&&:hover": { backgroundColor: ORANGE_FILL_HOVER },
          },
        },
        // I bottoni `text` e `outlined` primari sono a tutti gli effetti testo su
        // fondo chiaro (es. "Segna tutte come lette"): usano l'arancione
        // accessibile. Il bordo dell'outlined resta su `primary.main`, dove la
        // soglia e' 3:1.
        textPrimary: { color: orangeText },
        outlinedPrimary: { color: orangeText },
        // Bottone "fantasma" per gli hero scuri (UX-30): `variant="outlined"
        // color="inherit"`. Bordo e fondo seguono il colore del testo, cosi'
        // non si riscrive negli `sx` di ogni hero.
        outlined: {
          "&.MuiButton-colorInherit": {
            borderColor: "color-mix(in srgb, currentColor 45%, transparent)",
            backgroundColor: "color-mix(in srgb, currentColor 6%, transparent)",
            "@media (hover: hover)": {
              "&:hover": {
                borderColor: "color-mix(in srgb, currentColor 75%, transparent)",
                backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
              },
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.lg,
          boxShadow: cardShadow,
          // In dark l'ombra non stacca la card dallo sfondo: serve un bordo.
          ...(isDark ? { border: `1px solid ${SHADOW.cardBorderDark}` } : {}),
          transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
          // Si solleva solo una card che si tocca (UX-07): link, bottone o
          // con dentro una CardActionArea. Prima si muovevano tutte, anche
          // quelle da leggere e basta: una falsa promessa di interazione.
          // Solo sui dispositivi con un vero puntatore: sul touch l'hover
          // resterebbe appiccicato dopo il tap.
          "@media (hover: hover)": {
            "&:is(a, button, [role='button']):hover, a > &:hover, &:has(.MuiCardActionArea-root):hover":
              {
                boxShadow: cardHoverShadow,
                transform: "translateY(-2px)",
                ...(isDark ? { borderColor: SHADOW.cardBorderHoverDark } : {}),
              },
            // Con "riduci movimento" la card cambia ombra ma non si solleva.
            "@media (prefers-reduced-motion: reduce)": {
              "&:hover, a > &:hover": { transform: "none" },
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: RADIUS.lg },
        elevation2: { boxShadow: cardShadow },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        // Un gruppo di Accordion e' una card (UX-30): primo e ultimo prendono il
        // raggio delle card, non quello base del tema.
        root: {
          "&:first-of-type": { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
          "&:last-of-type": {
            borderBottomLeftRadius: RADIUS.lg,
            borderBottomRightRadius: RADIUS.lg,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: FONT_WEIGHT.semibold, borderRadius: RADIUS.sm },
        // Chip `color="primary"` pieno: etichetta bianca su #E65100 fa 3,79:1,
        // sotto AA. Stesso riempimento del bottone primario, 4,71:1. Da usare
        // solo su chip che si toccano (filtri, selezioni): l'arancio pieno
        // dice "qui si agisce" (UX-07).
        filledPrimary: { backgroundColor: ORANGE_FILL },
        // L'outlined e' testo sulla superficie: arancione accessibile.
        outlinedPrimary: { color: orangeText },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${sharedAppBar.from} 0%, ${sharedAppBar.to} 100%)`,
          boxShadow: SHADOW.popover,
          borderRadius: "0 !important",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        // Il binario di una barra di avanzamento e' neutro: col default MUI
        // (arancio schiarito) una barra a 0/5 sembrava piena. Solo le
        // determinate; il caricamento indeterminato resta com'e'.
        root: ({ theme }: { theme: Theme }) => ({
          "&.MuiLinearProgress-determinate": { backgroundColor: theme.palette.action.selected },
        }),
      },
    },
    MuiToggleButton: {
      // Come le tab (UX-07): niente maiuscolo forzato del default MUI.
      styleOverrides: { root: { textTransform: "none" } },
    },
    MuiTab: {
      // La tab selezionata e' testo: MUI la colora con `primary.main`, che si
      // ferma a 3,79:1 su bianco e 4,40:1 su #1E1E1E. L'indicatore sotto resta
      // su `primary.main` (elemento grafico, soglia 3:1).
      styleOverrides: {
        // Niente maiuscolo forzato (default MUI): meta' delle tab lo aveva e
        // meta' no (UX-07).
        root: { textTransform: "none" },
        textColorPrimary: { "&.Mui-selected": { color: orangeText } },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": { borderRadius: RADIUS.md },
        },
      },
    },
  } as const;
}

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: ORANGE,
      light: ORANGE_ON_DARK,
      dark: ORANGE_ON_LIGHT,
      // Da usare per TESTO e link arancioni su fondo chiaro (>= 4,5:1).
      // `main` resta per riempimenti, bordi e icone (soglia 3:1).
      onLight: ORANGE_ON_LIGHT,
      // Riempimento sotto un'etichetta bianca (bottoni, chip, pallini).
      fill: ORANGE_FILL,
      contrastText: BRAND.white,
    },
    // Valenza (UX-29): gli stessi valori degli esiti.
    success: {
      main: OUTCOME.light.win,
      dark: OUTCOME.light.winDark,
      contrastText: OUTCOME.light.onFill,
    },
    warning: { main: OUTCOME.light.draw, contrastText: OUTCOME.light.onFill },
    error: {
      main: OUTCOME.light.loss,
      dark: OUTCOME.light.lossDark,
      contrastText: OUTCOME.light.onFill,
    },
    // `info` non e' un colore (UX-29): il blu e' delle squadre.
    info: { main: NEUTRAL.grey, contrastText: BRAND.white },
    secondary: {
      main: BRAND.dark,
      light: NEUTRAL.light.inkSoft,
      dark: BRAND.black,
      contrastText: BRAND.white,
    },
    background: {
      default: NEUTRAL.light.background,
      paper: NEUTRAL.light.paper,
    },
    text: {
      primary: NEUTRAL.light.text,
      secondary: NEUTRAL.light.textSecondary,
    },
    border: { control: NEUTRAL.light.borderControl, role: "transparent" },
    match: lightMatch,
    team: TEAM,
    bib: BIB,
    medal: MEDAL.light,
    heroGradient: { ...heroGradient, border: "transparent", cardHead: heroGradient.band },
    warmSurface: WARM_SURFACE.light,
    appRole: APP_ROLE.light,
    focusRing: lightFocusRing,
    appBar: sharedAppBar,
    adminBand: lightAdminBand,
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: buildComponents("light"),
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: ORANGE,
      light: ORANGE_ON_DARK,
      dark: ORANGE_ON_LIGHT,
      // In dark il testo arancione usa la variante chiara (>= 7:1 sulle
      // superfici #121212 / #1E1E1E).
      onLight: ORANGE_ON_DARK,
      fill: ORANGE_FILL,
      contrastText: BRAND.white,
    },
    // Valenza (UX-29): gli stessi valori degli esiti, con etichetta scura sui
    // riempimenti chiari.
    success: { main: OUTCOME.dark.win, contrastText: OUTCOME.dark.onFill },
    warning: { main: OUTCOME.dark.draw, contrastText: OUTCOME.dark.onFill },
    error: { main: OUTCOME.dark.loss, contrastText: OUTCOME.dark.onFill },
    info: { main: NEUTRAL.dark.textSecondary, contrastText: NEUTRAL.onLightFill },
    secondary: {
      main: NEUTRAL.dark.inverse,
      light: BRAND.white,
      dark: NEUTRAL.dark.inverseDark,
      contrastText: BRAND.black,
    },
    background: {
      default: NEUTRAL.dark.background,
      paper: NEUTRAL.dark.paper,
    },
    text: {
      primary: NEUTRAL.dark.text,
      secondary: NEUTRAL.dark.textSecondary,
    },
    border: { control: NEUTRAL.dark.borderControl, role: ROLE_BORDER_DARK },
    match: darkMatch,
    team: TEAM,
    bib: BIB,
    medal: MEDAL.dark,
    heroGradient: { ...heroGradient, border: HERO.border, cardHead: HERO.cardHead },
    warmSurface: WARM_SURFACE.dark,
    appRole: APP_ROLE.dark,
    focusRing: darkFocusRing,
    appBar: sharedAppBar,
    adminBand: darkAdminBand,
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: buildComponents("dark"),
});

// Default export for backwards compatibility (usato in global-error.tsx che non ha accesso al context)
export default lightTheme;
