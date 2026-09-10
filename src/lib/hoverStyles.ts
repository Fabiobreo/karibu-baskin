import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";

type StyleObject = SystemStyleObject<Theme>;

/**
 * Sostituisce ogni `transform` con `none`, a qualsiasi profondità, e scarta i
 * rami che non ne contengono nessuno. Restituisce `null` se non c'è niente da
 * neutralizzare. Le funzioni (`(theme) => ...`) non vengono attraversate: non
 * sono oggetti di stile, e valutarle qui significherebbe duplicarne il valore.
 */
function neutralizeTransforms(styles: StyleObject): StyleObject | null {
  const out: Record<string, unknown> = {};
  let found = false;

  for (const [key, value] of Object.entries(styles as Record<string, unknown>)) {
    if (key === "transform") {
      out[key] = "none";
      found = true;
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const nested = neutralizeTransforms(value as StyleObject);
      if (nested) {
        out[key] = nested;
        found = true;
      }
    }
  }

  return found ? (out as StyleObject) : null;
}

/**
 * Frammento `sx` per gli effetti al passaggio del mouse.
 *
 * Da spreddare nell'`sx` del componente al posto di un `"&:hover"` scritto a
 * mano. Risolve due problemi in un colpo solo:
 *
 * - **touch:** `@media (hover: hover)` limita l'effetto ai dispositivi con un
 *   vero puntatore. Senza, dopo un tap lo stato hover resta appiccicato finché
 *   non si tocca altrove.
 * - **riduci movimento:** la regola globale in `src/theme.ts` azzera la durata
 *   delle transizioni, ma da sola farebbe saltare l'elemento nella posizione
 *   sollevata, di colpo. Qui i `transform` vengono proprio annullati, mentre
 *   ombre, bordi e opacità restano: l'effetto si vede ancora, semplicemente non
 *   si muove.
 *
 * ```tsx
 * <Paper sx={{ ...onHover({ transform: "translateY(-2px)", boxShadow: 4 }) }} />
 * ```
 *
 * Per un effetto su un discendente usare il selettore esplicito:
 * `onHover({ "& img": { transform: "scale(1.04)" } })`.
 */
export function onHover(styles: StyleObject): StyleObject {
  const reduced = neutralizeTransforms(styles);

  return {
    "@media (hover: hover)": {
      "&:hover": styles,
      // Dopo `&:hover`, per vincerla a pari specificità.
      ...(reduced ? { "@media (prefers-reduced-motion: reduce)": { "&:hover": reduced } } : {}),
    },
  } as StyleObject;
}
