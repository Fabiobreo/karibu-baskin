"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Theme } from "@mui/material/styles";
import { lightTheme, darkTheme } from "@/theme";

type ColorMode = "light" | "dark" | "system";

interface ThemeCtx {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  activeTheme: Theme;
}

const ThemeContext = createContext<ThemeCtx>({
  mode: "system",
  setMode: () => {},
  activeTheme: lightTheme,
});

const STORAGE_KEY = "karibu-color-mode";

function resolveTheme(mode: ColorMode, prefersDark: boolean): Theme {
  if (mode === "dark") return darkTheme;
  if (mode === "light") return lightTheme;
  return prefersDark ? darkTheme : lightTheme;
}

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(() => {
    if (typeof window === "undefined") return "system";
    const saved = localStorage.getItem(STORAGE_KEY) as ColorMode | null;
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    return "system";
  });
  const [prefersDark, setPrefersDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setMode = useCallback((newMode: ColorMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const activeTheme = resolveTheme(mode, prefersDark);

  return (
    <ThemeContext.Provider value={{ mode, setMode, activeTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
