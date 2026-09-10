"use client";
import { createTheme } from "@mui/material/styles";
import { heroGradient } from "@/lib/heroStyles";

// Re-export per retro-compatibilità (vedi src/lib/heroStyles.ts per il motivo).
export { heroGradient };

const ORANGE = "#E65100";
const DARK = "#1A1A1A";

// Arancione accessibile come TESTO su fondo chiaro: 5,60:1 su #FFFFFF e
// 5,11:1 su #F7F4F1 (background.default), quindi oltre la soglia AA 4,5:1.
// `primary.main` (#E65100) si ferma a 3,79:1 su bianco: va bene per
// riempimenti, bordi e icone (soglia 3:1) ma non per il testo.
const ORANGE_ON_LIGHT = "#BF360C";
// Equivalente per fondo scuro: 8,03:1 su #121212 e 7,15:1 su #1E1E1E.
const ORANGE_ON_DARK = "#FF8A50";

// Anello di focus da tastiera. `main` e' l'arancione chiaro, leggibile
// sull'header scuro (7,46:1 su #1A1A1A); `contrast` e' l'anello interno che
// lo stacca dalle superfici chiare, dove il solo arancione farebbe 2,33:1.
const lightFocusRing: FocusRingPalette = { main: ORANGE_ON_DARK, contrast: DARK };
const darkFocusRing: FocusRingPalette = { main: ORANGE_ON_DARK, contrast: "#0A0A0A" };

// L'AppBar resta scuro in entrambi i temi: e' una scelta deliberata (identita'
// del club, continuita' con l'hero). Qui cambia solo il modo di esprimerlo:
// i due colori sono token di palette, non piu' letterali dentro gli override.
const sharedAppBar: AppBarPalette = { from: DARK, to: "#2A2A2A" };

type MatchPalette = {
  win: string;
  winBg: string;
  loss: string;
  lossBg: string;
  draw: string;
  drawBg: string;
};

/**
 * Stati che si presentano come pastiglia piena con etichetta bianca sopra.
 * Il riempimento non segue il tema: deve restare abbastanza scuro da reggere
 * il bianco in chiaro come in scuro, quindi i valori sono gli stessi nei due
 * temi. Cambia solo `liveText`, che e' l'unico usato come testo sulle
 * superfici del tema e in scuro va schiarito.
 */
type StatusPalette = {
  /** Allenamento in corso: pallino pulsante e bordo della card. */
  live: string;
  /** Stesso stato, ma come TESTO ("IN CORSO") sulle superfici del tema. */
  liveText: string;
  /** Iscrizioni non ancora aperte. */
  pending: string;
  /** Iscrizioni chiuse. */
  closed: string;
  /** Banner "sei offline". */
  offline: string;
  /** Banner "di nuovo online". */
  online: string;
  /** Partita in trasferta: fa da contraltare a `match.win`, usato per la casa. */
  away: string;
};

const sharedStatus = {
  live: "#2E7D32",
  pending: "#6D4C41",
  closed: "#546E7A",
  offline: "#B71C1C",
  online: "#1B5E20",
  away: "#1565C0",
} as const;

const lightStatus: StatusPalette = { ...sharedStatus, liveText: "#2E7D32" };
// 8,04:1 su #121212, mentre il verde scuro si fermava a 3,35:1.
const darkStatus: StatusPalette = { ...sharedStatus, liveText: "#66BB6A" };

type AdminPalette = {
  /** Sezione "Attivita" della dashboard admin. */
  activity: string;
  /** Sezione "Anagrafiche". */
  registry: string;
  /** Sezione "Strumenti". */
  tools: string;
  // Alias per voce, mantenuti per non riscrivere i punti d'uso: puntano ai
  // tre colori di sezione qui sopra.
  allenamenti: string;
  partite: string;
  eventi: string;
  news: string;
  utenti: string;
  squadre: string;
  gironi: string;
  avversarie: string;
  esporta: string;
  audit: string;
};

type StatsPalette = {
  points: string;
  games: string;
  avg: string;
  twopt: string;
  threept: string;
  ft: string;
  fouls: string;
  illegalFouls: string;
  shotsAttempted: string;
};

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
};

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

declare module "@mui/material/styles" {
  interface Palette {
    match: MatchPalette;
    status: StatusPalette;
    admin: AdminPalette;
    stats: StatsPalette;
    medal: MedalPalette;
    heroGradient: HeroGradientPalette;
    focusRing: FocusRingPalette;
    appBar: AppBarPalette;
  }
  interface PaletteOptions {
    match?: MatchPalette;
    status?: StatusPalette;
    admin?: AdminPalette;
    stats?: StatsPalette;
    medal?: MedalPalette;
    heroGradient?: HeroGradientPalette;
    focusRing?: FocusRingPalette;
    appBar?: AppBarPalette;
  }

  // Arancione da usare per TESTO e link. Vedi ORANGE_ON_LIGHT / ORANGE_ON_DARK.
  interface PaletteColor {
    onLight: string;
  }
  interface SimplePaletteColorOptions {
    onLight?: string;
  }
}

const lightMatch: MatchPalette = {
  win: "#2E7D32",
  winBg: "#E8F5E9",
  loss: "#C62828",
  lossBg: "#FFEBEE",
  // Il pareggio usa l'arancione accessibile: `match.draw` colora sia testo su
  // fondo chiaro sia l'etichetta bianca del chip risultato, e #E65100 si ferma
  // a 3,79:1 in entrambi i versi.
  draw: ORANGE_ON_LIGHT,
  drawBg: "#FFF3E0",
};

const darkMatch: MatchPalette = {
  win: "#66BB6A",
  winBg: "#1B3320",
  loss: "#EF5350",
  // Un filo piu' scuro di #3A1A1A: con quello il chip "Sconfitta" si fermava a
  // 4,49:1, appena sotto la soglia. Ora 4,75:1.
  lossBg: "#331616",
  draw: "#FFA726",
  drawBg: "#3A2616",
};

// Tredici card della dashboard con tredici colori icona non codificavano nulla.
// Le sezioni sono tre (Attivita, Anagrafiche, Strumenti): un colore per
// sezione, cosi' il colore dice a quale gruppo appartiene la card. Tutti e tre
// superano 4,5:1 sulle superfici del tema, perche' colorano anche l'etichetta.
function buildAdminPalette(activity: string, registry: string, tools: string): AdminPalette {
  return {
    activity,
    registry,
    tools,
    allenamenti: activity,
    partite: activity,
    eventi: activity,
    news: activity,
    utenti: registry,
    squadre: registry,
    gironi: registry,
    avversarie: registry,
    esporta: tools,
    audit: tools,
  };
}

const lightAdmin = buildAdminPalette("#00695C", "#1565C0", "#37474F");
const darkAdmin = buildAdminPalette("#4DB6AC", "#64B5F6", "#B0BEC5");

// Le tessere statistiche restano nove, ma i colori distinti sono tre e ognuno
// codifica qualcosa: arancione per il dato principale (punti totali), rosso per
// la disciplina (falli), neutro per tutto il resto. Prima erano nove colori
// diversi, quindi i punti totali non risaltavano piu' della colonna falli.
// I token non spariscono: cambiano solo i valori a cui puntano.
const LIGHT_NEUTRAL_STAT = "#1A1A1A";
const LIGHT_FOUL_STAT = "#C62828"; // 5,62:1 su bianco

const lightStats: StatsPalette = {
  points: ORANGE_ON_LIGHT,
  games: LIGHT_NEUTRAL_STAT,
  avg: LIGHT_NEUTRAL_STAT,
  twopt: LIGHT_NEUTRAL_STAT,
  threept: LIGHT_NEUTRAL_STAT,
  ft: LIGHT_NEUTRAL_STAT,
  fouls: LIGHT_FOUL_STAT,
  illegalFouls: LIGHT_FOUL_STAT,
  shotsAttempted: LIGHT_NEUTRAL_STAT,
};

const DARK_NEUTRAL_STAT = "#F0F0F0";
const DARK_FOUL_STAT = "#EF5350"; // 5,37:1 su #121212

const darkStats: StatsPalette = {
  points: ORANGE_ON_DARK,
  games: DARK_NEUTRAL_STAT,
  avg: DARK_NEUTRAL_STAT,
  twopt: DARK_NEUTRAL_STAT,
  threept: DARK_NEUTRAL_STAT,
  ft: DARK_NEUTRAL_STAT,
  fouls: DARK_FOUL_STAT,
  illegalFouls: DARK_FOUL_STAT,
  shotsAttempted: DARK_NEUTRAL_STAT,
};

// I valori chiari del podio (oro #FFC107, argento #BDBDBD, bronzo #CD7F32)
// erano invisibili su fondo bianco: l'argento faceva 1,88:1. Qui sono
// saturati/scuriti fino a superare 4,5:1 su bianco, perche' i token colorano
// anche testo (badge, etichette) e non solo riempimenti. Le tre tinte restano
// distinguibili fra loro: oro olivastro, argento grigio, bronzo ramato.
// `deep` e' la seconda fermata del gradiente delle pastiglie.
const lightMedal: MedalPalette = {
  gold: "#8C6D00", // 4,88:1 su bianco
  goldDeep: "#6E5500",
  goldBg: "#F1EDE0", // gold al 12% su fondo carta
  silver: "#616161", // 6,19:1
  silverDeep: "#424242",
  silverBg: "#ECECEC",
  bronze: "#A85B2A", // 5,01:1
  bronzeDeep: "#7D4020",
  bronzeBg: "#F5EBE5",
};

// In dark i valori metallici funzionano gia': 11,81 / 12,63 / 7,53 su #1E1E1E.
const darkMedal: MedalPalette = {
  gold: "#FFD54F",
  goldDeep: "#FFA000",
  goldBg: "#423B26", // gold al 16% su #1E1E1E
  silver: "#E0E0E0",
  silverDeep: "#9E9E9E",
  silverBg: "#3D3D3D",
  bronze: "#D7A56B",
  bronzeDeep: "#8D6E63",
  bronzeBg: "#3C342A",
};

const sharedTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  // La rampa dei pesi non deve andare all'indietro: i default MUI danno a
  // h1/h2/h3 pesi 300/300/400, cioe' piu' leggeri di h4 (800). Qui i titoli
  // grandi restano almeno pesanti quanto quelli piccoli.
  h1: { fontWeight: 900, letterSpacing: "-1px" },
  h2: { fontWeight: 900, letterSpacing: "-0.8px" },
  h3: { fontWeight: 800, letterSpacing: "-0.6px" },
  h4: { fontWeight: 800, letterSpacing: "-0.5px" },
  h5: { fontWeight: 700, letterSpacing: "-0.3px" },
  h6: { fontWeight: 600 },
  subtitle1: { fontWeight: 500 },
  button: { fontWeight: 600, letterSpacing: 0 },
} as const;

const sharedShape = { borderRadius: 10 } as const;

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

  const cardShadow = isDark ? "0 2px 16px rgba(0,0,0,0.55)" : "0 2px 12px rgba(0,0,0,0.07)";
  const cardHoverShadow = isDark ? "0 10px 30px rgba(0,0,0,0.70)" : "0 6px 24px rgba(0,0,0,0.13)";

  return {
    MuiCssBaseline: {
      styleOverrides: {
        ":focus-visible": focusVisibleStyles,
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
      styleOverrides: {
        root: { "&:focus-visible": focusRingStyles },
      },
    },
    MuiLink: {
      // I link testuali senza `color` esplicito prendono l'arancione
      // accessibile invece di `primary.main` (3,79:1 su bianco). Sta nei
      // defaultProps, non negli styleOverrides, cosi' un `color="inherit"`
      // dentro un hero scuro continua a vincere.
      defaultProps: { color: "primary.onLight" },
      styleOverrides: {
        root: { "&:focus-visible": focusRingStyles },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        // L'elemento che prende il focus e' l'<input> interno, ma l'anello va
        // disegnato attorno al bordo visibile. `.MuiInputBase-input:focus`
        // azzera comunque l'outline sull'input, quindi la regola globale li'
        // non basterebbe.
        root: { "&:has(:focus-visible)": focusRingStyles },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 600,
          paddingTop: 8,
          paddingBottom: 8,
        },
        containedPrimary: {
          // Riempimento con l'arancione scuro: bianco su #BF360C fa 5,60:1,
          // mentre su #E65100 si fermava a 3,79:1 (sotto la soglia AA).
          backgroundColor: ORANGE_ON_LIGHT,
          boxShadow: "0 2px 8px rgba(191, 54, 12, 0.30)",
          // `&&` per battere le `variants` di MuiButton, che assegnano
          // primary.dark in hover (cioe' lo stesso colore del riposo).
          "@media (hover: hover)": {
            "&&:hover": {
              backgroundColor: "#A32E0A",
              boxShadow: "0 4px 14px rgba(191, 54, 12, 0.45)",
            },
          },
        },
        // I bottoni `text` e `outlined` primari sono a tutti gli effetti testo su
        // fondo chiaro (es. "Segna tutte come lette"): usano l'arancione
        // accessibile. Il bordo dell'outlined resta su `primary.main`, dove la
        // soglia e' 3:1.
        textPrimary: { color: orangeText },
        outlinedPrimary: { color: orangeText },
        containedSecondary: {
          boxShadow: "0 2px 8px rgba(0,0,0,0.20)",
          "&:hover": { boxShadow: "0 4px 14px rgba(0,0,0,0.30)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: cardShadow,
          // In dark l'ombra non stacca la card dallo sfondo: serve un bordo.
          ...(isDark ? { border: "1px solid rgba(255,255,255,0.09)" } : {}),
          transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
          // Solo sui dispositivi con un vero puntatore: sul touch l'hover
          // resterebbe appiccicato dopo il tap.
          "@media (hover: hover)": {
            "&:hover": {
              boxShadow: cardHoverShadow,
              transform: "translateY(-2px)",
              ...(isDark ? { borderColor: "rgba(255,255,255,0.22)" } : {}),
            },
            // Dopo la regola qui sopra, per vincerla a pari specificita'. Con
            // "riduci movimento" la card cambia ombra ma non si solleva:
            // azzerare solo la durata della transizione la farebbe comunque
            // saltare in alto, di colpo.
            "@media (prefers-reduced-motion: reduce)": {
              "&:hover": { transform: "none" },
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 14 },
        elevation2: { boxShadow: cardShadow },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6 },
        // Chip `color="primary"` pieno (es. "Sondaggio"): etichetta bianca su
        // #E65100 fa 3,79:1, sotto AA. Stesso rimedio dei bottoni contained:
        // riempimento con l'arancione scuro, 5,60:1 in entrambi i temi.
        filledPrimary: { backgroundColor: ORANGE_ON_LIGHT },
        // L'outlined e' testo sulla superficie: arancione accessibile.
        outlinedPrimary: { color: orangeText },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${sharedAppBar.from} 0%, ${sharedAppBar.to} 100%)`,
          boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
          borderRadius: "0 !important",
        },
      },
    },
    MuiTab: {
      // La tab selezionata e' testo: MUI la colora con `primary.main`, che si
      // ferma a 3,79:1 su bianco e 4,40:1 su #1E1E1E. L'indicatore sotto resta
      // su `primary.main` (elemento grafico, soglia 3:1).
      styleOverrides: {
        textColorPrimary: { "&.Mui-selected": { color: orangeText } },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": { borderRadius: 8 },
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
      contrastText: "#fff",
    },
    secondary: {
      main: DARK,
      light: "#3D3D3D",
      dark: "#000000",
      contrastText: "#fff",
    },
    background: {
      default: "#F7F4F1",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A1A1A",
      secondary: "#666666",
    },
    match: lightMatch,
    status: lightStatus,
    admin: lightAdmin,
    stats: lightStats,
    medal: lightMedal,
    heroGradient,
    focusRing: lightFocusRing,
    appBar: sharedAppBar,
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
      contrastText: "#fff",
    },
    secondary: {
      main: "#E0E0E0",
      light: "#FFFFFF",
      dark: "#BDBDBD",
      contrastText: "#000",
    },
    background: {
      default: "#121212",
      paper: "#1E1E1E",
    },
    text: {
      primary: "#F0F0F0",
      secondary: "#AAAAAA",
    },
    match: darkMatch,
    status: darkStatus,
    admin: darkAdmin,
    stats: darkStats,
    medal: darkMedal,
    heroGradient,
    focusRing: darkFocusRing,
    appBar: sharedAppBar,
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: buildComponents("dark"),
});

// Default export for backwards compatibility (usato in global-error.tsx che non ha accesso al context)
export default lightTheme;
