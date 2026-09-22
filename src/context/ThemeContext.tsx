"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  startTransition,
  Fragment,
} from "react";
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

/**
 * Chiama `cb` quando lo streaming della pagina è finito e React ha inserito al
 * loro posto tutte le sezioni in <Suspense>. Non basta `load`: React 19
 * scagliona la comparsa delle sezioni, che possono restare nei `div hidden`
 * con id `S:<n>` in fondo al <body> anche dopo. Quei div sono un dettaglio
 * interno di React; se il formato cambiasse, il timeout evita l'attesa infinita.
 * In una scheda in background React non inserisce le sezioni (aspetta un
 * frame, e le schede nascoste non ne disegnano): l'attesa parte quando la
 * scheda diventa visibile, altrimenti il timeout scatterebbe a vuoto.
 */
function afterStreamRevealed(cb: () => void): () => void {
  let done = false;
  let observer: MutationObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = () => document.querySelector('body > div[hidden][id^="S:"]') !== null;
  const stop = () => {
    done = true;
    observer?.disconnect();
    clearTimeout(timer);
    window.removeEventListener("load", start);
    document.removeEventListener("visibilitychange", start);
  };
  const finish = () => {
    if (done) return;
    stop();
    cb();
  };
  function start() {
    if (done || observer) return;
    if (document.visibilityState === "hidden") {
      document.addEventListener("visibilitychange", start);
      return;
    }
    document.removeEventListener("visibilitychange", start);
    if (!pending()) return finish();
    observer = new MutationObserver(() => {
      if (!pending()) finish();
    });
    observer.observe(document.body, { childList: true });
    timer = setTimeout(finish, 5000);
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
  return stop;
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
  // true quando la preferenza reale del browser è stata applicata (a `load`).
  const [synced, setSynced] = useState(false);
  // Cambia (una volta) se il tema reale differisce da quello usato dal server:
  // vedi sotto.
  const [remountKey, setRemountKey] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    // Al primo accesso senza cookie, o con un cookie non più valido (tema del
    // sistema cambiato), il server ha reso la pagina con `initialScheme`,
    // comprese le sezioni in <Suspense> che arrivano dopo in streaming. Se il
    // tema cambia mentre una di queste non è ancora idratata, React la idrata
    // col tema nuovo su HTML del vecchio: hydration mismatch sulle classi
    // Emotion, che React non corregge (la sezione resta chiara in una pagina
    // scura). Per questo, quando il tema reale differisce da quello del server,
    // l'albero sotto il provider si rimonta (`remountKey`): le sezioni ancora
    // da idratare vengono rese sul client, senza confronto con l'HTML del
    // server. Succede solo in quei casi; di norma il cookie è giusto e non
    // cambia niente. Si aspetta la fine dello stream (`afterStreamRevealed`)
    // per non smontare sezioni che React sta ancora inserendo: resterebbero
    // orfane, nascoste in fondo al <body>.
    const serverTheme = resolveTheme(initialMode, initialScheme === "dark");
    const sync = () =>
      startTransition(() => {
        let actualMode = initialMode;
        // Migrazione una-tantum dalla vecchia persistenza localStorage al cookie.
        if (!readCookieMode()) {
          const legacy = localStorage.getItem(COLOR_MODE_COOKIE) as ColorMode | null;
          if (legacy === "light" || legacy === "dark" || legacy === "system") {
            writeCookieMode(legacy);
            setModeState(legacy);
            actualMode = legacy;
          }
        }
        setPrefersDark(mq.matches);
        setSynced(true);
        if (resolveTheme(actualMode, mq.matches) !== serverTheme) setRemountKey(1);
      });

    const stopWaiting = afterStreamRevealed(sync);

    const handler = (e: MediaQueryListEvent) => startTransition(() => setPrefersDark(e.matches));
    mq.addEventListener("change", handler);
    return () => {
      stopWaiting();
      mq.removeEventListener("change", handler);
    };
  }, [initialMode, initialScheme]);

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
  // Prima di `synced` si salta: attributo e cookie li ha già scritti lo script
  // in <head> con la preferenza reale, mentre qui c'è ancora il tema del server
  // (vedi sopra), e riscriverli farebbe tornare chiaro lo sfondo.
  useEffect(() => {
    if (!synced) return;
    document.documentElement.dataset.scheme = resolvedScheme;
    // Il cookie hint lo scrive solo la modalita' "system", come fa lo script
    // bloccante in <head>: con una scelta esplicita il valore non deve essere
    // sovrascritto, o al ritorno su "system" l'SSR ripartirebbe da un esito
    // fasullo prima che lo script possa correggerlo.
    if (mode === "system") {
      document.cookie = `${COLOR_SCHEME_COOKIE}=${resolvedScheme}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [resolvedScheme, mode, synced]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, activeTheme }}>
      <Fragment key={remountKey}>{children}</Fragment>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
