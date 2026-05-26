"use client";
import { createTheme } from "@mui/material/styles";
import { heroGradient } from "@/lib/heroStyles";

// Re-export per retro-compatibilità (vedi src/lib/heroStyles.ts per il motivo).
export { heroGradient };

const ORANGE = "#E65100";
const DARK = "#1A1A1A";

type MatchPalette = {
  win: string;
  winBg: string;
  loss: string;
  lossBg: string;
  draw: string;
  drawBg: string;
};

type AdminPalette = {
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
  silver: string;
  bronze: string;
};

type HeroGradientPalette = {
  dark: string;
};

declare module "@mui/material/styles" {
  interface Palette {
    match: MatchPalette;
    admin: AdminPalette;
    stats: StatsPalette;
    medal: MedalPalette;
    heroGradient: HeroGradientPalette;
  }
  interface PaletteOptions {
    match?: MatchPalette;
    admin?: AdminPalette;
    stats?: StatsPalette;
    medal?: MedalPalette;
    heroGradient?: HeroGradientPalette;
  }
}

const lightMatch: MatchPalette = {
  win: "#2E7D32",
  winBg: "#E8F5E9",
  loss: "#C62828",
  lossBg: "#FFEBEE",
  draw: "#E65100",
  drawBg: "#FFF3E0",
};

const darkMatch: MatchPalette = {
  win: "#66BB6A",
  winBg: "#1B3320",
  loss: "#EF5350",
  lossBg: "#3A1A1A",
  draw: "#FFA726",
  drawBg: "#3A2616",
};

const lightAdmin: AdminPalette = {
  allenamenti: "#00897B",
  partite: "#2E7D32",
  eventi: "#6A1B9A",
  news: "#0277BD",
  utenti: "#E65100",
  squadre: "#1565C0",
  gironi: "#00695C",
  avversarie: "#5D4037",
  esporta: "#37474F",
  audit: "#4527A0",
};

const darkAdmin: AdminPalette = {
  allenamenti: "#4DB6AC",
  partite: "#66BB6A",
  eventi: "#AB47BC",
  news: "#4FC3F7",
  utenti: "#FFA726",
  squadre: "#64B5F6",
  gironi: "#4DB6AC",
  avversarie: "#A1887F",
  esporta: "#90A4AE",
  audit: "#9575CD",
};

const lightStats: StatsPalette = {
  points: "#E65100",
  games: "#1565C0",
  avg: "#1A1A1A",
  twopt: "#2E7D32",
  threept: "#7B1FA2",
  ft: "#00838F",
  fouls: "#C62828",
  illegalFouls: "#B71C1C",
  shotsAttempted: "#455A64",
};

const darkStats: StatsPalette = {
  points: "#FFA726",
  games: "#64B5F6",
  avg: "#F0F0F0",
  twopt: "#66BB6A",
  threept: "#BA68C8",
  ft: "#4DD0E1",
  fouls: "#EF5350",
  illegalFouls: "#E57373",
  shotsAttempted: "#90A4AE",
};

const lightMedal: MedalPalette = {
  gold: "#FFC107",
  silver: "#BDBDBD",
  bronze: "#CD7F32",
};

const darkMedal: MedalPalette = {
  gold: "#FFD54F",
  silver: "#E0E0E0",
  bronze: "#D7A56B",
};

const sharedTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h4: { fontWeight: 800, letterSpacing: "-0.5px" },
  h5: { fontWeight: 700, letterSpacing: "-0.3px" },
  h6: { fontWeight: 600 },
  subtitle1: { fontWeight: 500 },
  button: { fontWeight: 600, letterSpacing: 0 },
} as const;

const sharedShape = { borderRadius: 10 } as const;

const sharedComponents = {
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
        boxShadow: "0 2px 8px rgba(230, 81, 0, 0.30)",
        "&:hover": { boxShadow: "0 4px 14px rgba(230, 81, 0, 0.45)" },
      },
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
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: "0 6px 24px rgba(0,0,0,0.13)",
          transform: "translateY(-2px)",
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: { borderRadius: 14 },
      elevation2: { boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { fontWeight: 600, borderRadius: 6 },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        background: "linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
        borderRadius: "0 !important",
      },
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

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: ORANGE,
      light: "#FF8A50",
      dark: "#BF360C",
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
    admin: lightAdmin,
    stats: lightStats,
    medal: lightMedal,
    heroGradient,
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: sharedComponents,
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: ORANGE,
      light: "#FF8A50",
      dark: "#BF360C",
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
    admin: darkAdmin,
    stats: darkStats,
    medal: darkMedal,
    heroGradient,
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: sharedComponents,
});

// Default export for backwards compatibility (usato in global-error.tsx che non ha accesso al context)
export default lightTheme;
