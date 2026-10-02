import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";
import { TYPE_SCALE } from "@/lib/typeScale";

/**
 * Lato minimo di un bersaglio tattile, in px.
 *
 * 44 è la soglia raccomandata da WCAG 2.5.5 e dalle linee guida di Apple e
 * Google: sotto, un dito la manca. Il sito si usa in palestra, spesso in piedi
 * e col telefono in una mano sola.
 */
export const TOUCH_TARGET_SIZE = 44;

/**
 * Frammento `sx` per un bersaglio quadrato da 44x44.
 *
 * L'icona dentro resta della sua dimensione: cresce l'area cliccabile, non il
 * disegno. Usarlo sugli `IconButton` piccoli.
 *
 * ```tsx
 * <IconButton aria-label="Mese successivo" sx={TOUCH_TARGET}>
 * ```
 */
export const TOUCH_TARGET: SystemStyleObject<Theme> = {
  width: TOUCH_TARGET_SIZE,
  height: TOUCH_TARGET_SIZE,
};

/**
 * Solo su telefono: porta a 44 px di altezza un controllo compatto (bottone
 * `small`, `ToggleButton`) che su desktop resta della sua misura. Per le barre
 * degli strumenti dell'admin, dense su desktop e usate col dito in palestra.
 */
export const TOUCH_TARGET_ON_PHONE = { minHeight: { xs: TOUCH_TARGET_SIZE, sm: 0 } } as const;

/** Come sopra, per un `TextField size="small"` (alto 40 px). */
export const TOUCH_FIELD_ON_PHONE = {
  "& .MuiInputBase-root": { minHeight: { xs: TOUCH_TARGET_SIZE, sm: 0 } },
} as const;

/**
 * Solo su telefono: un `Chip` che si tocca (filtro, selettore) diventa alto 44 px
 * a vista, con il testo a 14 px (UX-45). Niente area invisibile più grande: chi
 * fatica a mirare ha bisogno di vedere il bersaglio. Va per ultimo nello `sx`.
 *
 * La media query è scritta per esteso (è `theme.breakpoints.down("sm")`) perché
 * una funzione nello `sx` non passa da un Server Component a `Chip`.
 */
export const TOUCH_CHIP_ON_PHONE = {
  "@media (max-width:599.95px)": {
    minHeight: TOUCH_TARGET_SIZE,
    minWidth: TOUCH_TARGET_SIZE,
    fontSize: TYPE_SCALE.sm,
  },
} as const;

/**
 * Variante per i controlli che hanno una larghezza propria (bottoni con
 * etichetta, `ToggleButton` in fila): vincola solo il minimo, senza forzare
 * il quadrato.
 */
export const TOUCH_TARGET_MIN: SystemStyleObject<Theme> = {
  minWidth: TOUCH_TARGET_SIZE,
  minHeight: TOUCH_TARGET_SIZE,
};
