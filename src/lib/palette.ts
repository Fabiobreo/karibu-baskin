/**
 * La palette del sito (UX-29): l'unico file con valori di colore scritti a
 * mano. Tema MUI, hero, immagini Open Graph, tabellino, email e pagina di
 * errore critico leggono da qui; ESLint segnala un hex o un rgb() in qualunque
 * altro file.
 *
 * Una tinta, un significato; tutto il resto e' neutro:
 * - arancio: si tocca, oppure e' attivo/selezionato;
 * - nero del marchio: superfici di marchio e neutro invertito;
 * - verde / ambra / rosso: valenza (positivo / a meta' / negativo), esiti;
 * - tinte squadra: identita' della squadra di una stagione, mai testo;
 * - metalli: livelli e onori, sempre con una forma.
 * Eccezioni chiuse: casacche d'allenamento e marchi social.
 *
 * La palette e' chiusa: una tinta o un significato nuovo si discutono prima con
 * il committente. I valori sono verificati da `palette.test.ts` (contrasto
 * WCAG) e dalla revisione di UX-29 (CIEDE2000 e daltonismo, Machado 2009).
 *
 * TypeScript puro, niente MUI: si importa anche da Server Component, OG ed
 * email.
 */

/** Marchio: arancio e nero. */
export const BRAND = {
  /** Arancio della maglia: riempimenti, bordi, icone (3,79:1 su bianco, non testo). */
  orange: "#E65100",
  /** Riempimento sotto un'etichetta bianca: bottone primario, chip pieni (4,71:1). */
  orangeFill: "#C84B00",
  /** Hover del riempimento (6,22:1). */
  orangeFillHover: "#A83F00",
  /** Arancio come TESTO su fondo chiaro (5,60:1 su bianco, 5,11:1 sul crema). */
  orangeOnLight: "#BF360C",
  /** Arancio come TESTO su fondo scuro (8,03:1 su #121212). */
  orangeOnDark: "#FF8A50",
  /** Bagliore dell'hero: l'arancio al 16%. */
  orangeGlow: "rgba(230, 81, 0, 0.16)",
  orangeGlowNone: "rgba(230, 81, 0, 0)",
  /** Il nero del marchio: header, hero, AppBar. */
  dark: "#1A1A1A",
  /** Un gradino sopra `dark`, per bordi e superfici staccate sul fondo scuro. */
  darkSoft: "#2A2A2A",
  white: "#FFFFFF",
  black: "#000000",
} as const;

/** Superfici e testo dei due temi. */
export const NEUTRAL = {
  light: {
    background: "#F7F4F1",
    paper: "#FFFFFF",
    text: "#1A1A1A",
    textSecondary: "#666666",
    /** Bordo dei campi dei moduli: 3,65:1 su bianco, 3,33:1 sul crema (WCAG 1.4.11). */
    borderControl: "#8A8580",
    /** `secondary.light`. */
    inkSoft: "#3D3D3D",
    /** Divisori e bordi decorativi (non portano significato). */
    divider: "rgba(0, 0, 0, 0.12)",
    hover: "rgba(0, 0, 0, 0.04)",
  },
  dark: {
    background: "#121212",
    paper: "#1E1E1E",
    text: "#F0F0F0",
    textSecondary: "#AAAAAA",
    /** 3,27:1 su #1E1E1E, 3,67:1 su #121212. */
    borderControl: "#6E6E6E",
    /** `secondary`: il neutro invertito del tema scuro. */
    inverse: "#E0E0E0",
    inverseDark: "#BDBDBD",
    divider: "rgba(255, 255, 255, 0.12)",
    hover: "rgba(255, 255, 255, 0.08)",
  },
  /** Etichetta scura sopra i riempimenti chiari del tema scuro. */
  onLightFill: "rgba(0, 0, 0, 0.87)",
  /** Grigio neutro sotto un'etichetta bianca (6,19:1): `info`, segnaposto. */
  grey: "#616161",
} as const;

/** Fondo degli hero e del footer: grafite pieno, uguale nei due temi. */
export const HERO = {
  from: "#141414",
  to: "#1E1E1E",
  /** Bordo inferiore degli hero in tema scuro. */
  border: "rgba(255, 255, 255, 0.14)",
  /** Velatura sopra una foto di copertina, per reggere il testo bianco. */
  photoScrim: "rgba(0, 0, 0, 0.55)",
} as const;

/**
 * Testo e linee sopra gli hero, che restano scuri in entrambi i temi: i token
 * `text.*` seguirebbero il tema corrente e in chiaro darebbero nero su nero.
 */
export const HERO_TEXT = {
  primary: "#FFFFFF",
  /** Sottotitoli e didascalie. */
  secondary: "#E0E0E0",
  /** Testo di servizio, il piu' smorzato che regga la soglia AA sul fondo hero. */
  muted: "#BDBDBD",
  /** Filetti e bordi sottili sul fondo hero. */
  line: "rgba(255, 255, 255, 0.14)",
  /** Bordo di un elemento che si tocca sul fondo hero (bottone fantasma, chip). */
  lineStrong: "rgba(255, 255, 255, 0.32)",
  /** Superficie leggermente staccata sul fondo hero (pillole, riquadri). */
  surface: "rgba(255, 255, 255, 0.08)",
  /** La stessa superficie in hover. */
  surfaceHover: "rgba(255, 255, 255, 0.14)",
} as const;

/**
 * Valenza ed esiti: `success` = vittoria, `warning` = pareggio, `error` =
 * sconfitta. Pareggio e avviso sono lo stesso significato ("a meta'"): li
 * distinguono la lettera "P" e l'icona dell'avviso.
 */
export const OUTCOME = {
  light: {
    win: "#2E7D32",
    winBg: "#E8F5E9",
    /** Banner "di nuovo online" (7,87:1 col bianco). */
    winDark: "#1B5E20",
    loss: "#C62828",
    lossBg: "#FFEBEE",
    /** Banner "sei offline" (6,57:1 col bianco). */
    lossDark: "#B71C1C",
    /** Ambra-senape (h 88): 5,52:1 su bianco, lontano dall'arancio del marchio (ΔE 24,7). */
    draw: "#816512",
    drawBg: "#F8EED1",
    onFill: "#FFFFFF",
  },
  dark: {
    win: "#66BB6A",
    winBg: "#1B3320",
    loss: "#EF5350",
    lossBg: "#331616",
    draw: "#DEBA50",
    drawBg: "#322B16",
    onFill: "rgba(0, 0, 0, 0.87)",
  },
} as const;

/**
 * Tinte squadra: identita' della squadra di una stagione. Un solo hex per i due
 * temi (finestra di luminanza 0,139-0,183): etichetta bianca >= 4,5:1 e >= 3:1
 * contro tutte le superfici chiare e scure. Solo grafico o riempimento, mai
 * testo. Si leggono sempre da `@/lib/teamColors`.
 *
 * L'ordine e' quello di proposta per una squadra nuova; Ardesia e' della
 * Karibu di stagione.
 */
export const TEAM = {
  blue: "#4B6FCD",
  raspberry: "#B05583",
  taupe: "#8A6E60",
  violet: "#7F5AA6",
  petrol: "#167F8E",
  slate: "#5C6E76",
} as const;

/** Badge del ruolo Baskin: grafite per tutti i ruoli, l'informazione e' il numero (8,86:1). */
export const ROLE_FILL = "#4A4A4A";

/** Casacche d'allenamento: colori veri delle maglie, sempre accompagnati dal nome. */
export const BIB = {
  orange: "#E65100",
  black: "#1A1A1A",
  white: "#757575",
} as const;

/** Metalli (livelli e onori), sempre con una forma: disco, coppa, stella. */
export const MEDAL = {
  light: {
    gold: "#7A5F00",
    goldDeep: "#6E5500",
    goldBg: "#F1EDE0",
    silver: "#616161",
    silverDeep: "#424242",
    silverBg: "#ECECEC",
    bronze: "#94501F",
    bronzeDeep: "#7D4020",
    bronzeBg: "#F5EBE5",
  },
  dark: {
    gold: "#FFD54F",
    goldDeep: "#FFA000",
    goldBg: "#423B26",
    silver: "#E0E0E0",
    silverDeep: "#9E9E9E",
    silverBg: "#3D3D3D",
    bronze: "#D7A56B",
    bronzeDeep: "#8D6E63",
    bronzeBg: "#3C342A",
  },
} as const;

/** Marchi altrui, solo per gli hover delle icone social. */
export const SOCIAL_BRAND = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  youtube: "#FF0000",
  whatsapp: "#25D366",
  whatsappDark: "#128C7E",
} as const;

/** Logo di Google sul bottone di accesso (marchio altrui, dalle linee guida Google). */
export const GOOGLE_BRAND = {
  blue: "#4285F4",
  green: "#34A853",
  yellow: "#FBBC05",
  red: "#EA4335",
} as const;

/** Anello di focus da tastiera: arancio chiaro con un anello interno scuro. */
export const FOCUS_RING = {
  main: BRAND.orangeOnDark,
  contrastLight: BRAND.dark,
  contrastDark: "#0A0A0A",
} as const;

/** Ombre delle card (le ombre non sono colori con un significato). */
export const SHADOW = {
  card: "0 2px 12px rgba(0, 0, 0, 0.07)",
  cardHover: "0 6px 24px rgba(0, 0, 0, 0.13)",
  cardDark: "0 2px 16px rgba(0, 0, 0, 0.55)",
  cardHoverDark: "0 10px 30px rgba(0, 0, 0, 0.7)",
  popover: "0 2px 12px rgba(0, 0, 0, 0.25)",
  /** Bordo delle card in scuro, dove le ombre nere sul #121212 non si vedono. */
  cardBorderDark: "rgba(255, 255, 255, 0.09)",
  cardBorderHoverDark: "rgba(255, 255, 255, 0.22)",
  /** Ombra sotto il testo bianco sopra una foto. */
  textOnPhoto: "0 1px 8px rgba(0, 0, 0, 0.5)",
} as const;

/** Email: niente tema, niente variabili CSS. Grigi e marchio. */
export const EMAIL = {
  background: "#F7F4F1",
  card: "#FFFFFF",
  text: "#1A1A1A",
  textSecondary: "#666666",
  border: "#E0E0E0",
  button: BRAND.orangeFill,
  buttonText: BRAND.white,
  header: BRAND.dark,
} as const;
