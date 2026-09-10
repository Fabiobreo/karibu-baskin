"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Theme } from "@mui/material/styles";
import { lightTheme, darkTheme } from "@/theme";
import {
  COLOR_MODE_COOKIE,
  COLOR_SCHEME_COOKIE,
  type ColorMode,
  type ResolvedScheme,
} from "@/lib/colorMode";

// Persistito in un cookie (non in localStorage) così il Server Component può
// leggerlo e renderizzare il tema corretto al primo paint → niente hydration
// mismatch sulle classi Emotion (che dipendono dal theme object al render).
//
// Lo stesso vale per la modalità "system": la media query non si può leggere
// durante il render (divergerebbe dall'SSR), quindi il suo esito viaggia in un
// secondo cookie (`karibu-scheme`) scritto dallo script bloccante in <head>
// PRIMA del primo paint. Il Server Component lo rilegge e lo passa qui come
// `initialScheme`. L'inizializzazione resta deterministica — server e primo
// render client partono dallo stesso valore — ma la risoluzione avviene prima
// del paint invece che dopo il mount, quindi senza lampo chiaro.

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

function resolveTheme(mode: ColorMode, prefersDark: boolean): Theme {
  if (mode === "dark") return darkTheme;
  if (mode === "light") return lightTheme;
  return prefersDark ? darkTheme : lightTheme;
}

function readCookieMode(): ColorMode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COLOR_MODE_COOKIE}=([^;]+)`));
  const val = match?.[1];
  if (val === "light" || val === "dark" || val === "system") return val;
  return null;
}

function writeCookieMode(mode: ColorMode) {
  // 1 anno, path root, lax — coerente con il cookie della lingua
  document.cookie = `${COLOR_MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeContextProvider({
  initialMode = "system",
  initialScheme = "light",
  children,
}: {
  initialMode?: ColorMode;
  initialScheme?: ResolvedScheme;
  children: React.ReactNode;
}) {
  // Init deterministico: stesso valore lato server e al primo render client
  // (arriva dal cookie letto nel Server Component). Mai leggere localStorage/
  // matchMedia qui, altrimenti il primo render client divergerebbe dall'SSR.
  const [mode, setModeState] = useState<ColorMode>(initialMode);
  // prefersDark parte dall'esito già risolto lato server (cookie `karibu-scheme`):
  // deterministico come prima, ma allineato alla preferenza reale del sistema.
  const [prefersDark, setPrefersDark] = useState(initialScheme === "dark");

  useEffect(() => {
    // Migrazione una-tantum dalla vecchia persistenza localStorage al cookie.
    if (!readCookieMode()) {
      const legacy = localStorage.getItem(COLOR_MODE_COOKIE) as ColorMode | null;
      if (legacy === "light" || legacy === "dark" || legacy === "system") {
        writeCookieMode(legacy);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- migrazione una-tantum localStorage→cookie, solo al primo mount
        setModeState(legacy);
      }
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setMode = useCallback((newMode: ColorMode) => {
    setModeState(newMode);
    writeCookieMode(newMode);
  }, []);

  const activeTheme = resolveTheme(mode, prefersDark);
  const resolvedScheme: ResolvedScheme = activeTheme.palette.mode === "dark" ? "dark" : "light";

  // `data-scheme` su <html> non e' solo un residuo pre-idratazione: la regola
  // `html[data-scheme="dark"] body` in globals.css e' piu' specifica di quella
  // di CssBaseline, quindi finche' l'attributo resta "dark" lo sfondo resta
  // scuro anche dopo che il tema chiaro e' stato applicato (serviva un refresh
  // per rimetterlo a posto). Va tenuto in sincrono ad ogni cambio.
  useEffect(() => {
    document.documentElement.dataset.scheme = resolvedScheme;
    // Il cookie hint lo scrive solo la modalita' "system", come fa lo script
    // bloccante in <head>: con una scelta esplicita il valore non deve essere
    // sovrascritto, o al ritorno su "system" l'SSR ripartirebbe da un esito
    // fasullo prima che lo script possa correggerlo.
    if (mode === "system") {
      document.cookie = `${COLOR_SCHEME_COOKIE}=${resolvedScheme}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [resolvedScheme, mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, activeTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
