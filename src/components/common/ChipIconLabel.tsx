import type { ReactNode } from "react";
import { Box } from "@mui/material";

interface ChipIconLabelProps {
  /** Icona (18 px nei chip `small`) o avatar; senza, resta la sola etichetta. */
  icon?: ReactNode;
  /** Taglia e variante del `Chip` che la contiene: decidono le distanze. */
  size?: "small" | "medium";
  variant?: "filled" | "outlined";
  children: ReactNode;
}

// Rientro dell'icona nel padding dell'etichetta e distanza dal testo, in px:
// le stesse posizioni che MUI da' a `.MuiChip-icon` e `.MuiChip-avatar`.
const SPACING = {
  small: { filled: { inset: -4, gap: 4 }, outlined: { inset: -5, gap: 3 } },
  medium: { filled: { inset: -7, gap: 6 }, outlined: { inset: -7, gap: 5 } },
};

/**
 * Etichetta di un `Chip` con l'icona dentro, per i Server Component: nelle
 * prop `icon`/`avatar` il `Chip` fa `isValidElement`, e un elemento che arriva
 * dal server non ancora risolto viene scartato in SSR e disegnato nel browser
 * (errore di idratazione). Dentro `label` e' un figlio qualunque.
 */
export default function ChipIconLabel({
  icon,
  size = "medium",
  variant = "filled",
  children,
}: ChipIconLabelProps) {
  if (!icon) return <>{children}</>;
  const { inset, gap } = SPACING[size][variant];
  return (
    <Box
      component="span"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: `${gap}px`,
        ml: `${inset}px`,
        minWidth: 0,
      }}
    >
      {icon}
      <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {children}
      </Box>
    </Box>
  );
}
