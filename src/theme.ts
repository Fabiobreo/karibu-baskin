"use client";
import { createTheme } from "@mui/material/styles";

const ORANGE = "#E65100";
const DARK   = "#1A1A1A";

const theme = createTheme({
  palette: {
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
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.5px" },
    h5: { fontWeight: 700, letterSpacing: "-0.3px" },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 600, letterSpacing: 0 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
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
          "&:hover": {
            boxShadow: "0 4px 14px rgba(230, 81, 0, 0.45)",
          },
        },
        containedSecondary: {
          boxShadow: "0 2px 8px rgba(0,0,0,0.20)",
          "&:hover": {
            boxShadow: "0 4px 14px rgba(0,0,0,0.30)",
          },
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
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: "rgba(0,0,0,0.08)" },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

export default theme;
