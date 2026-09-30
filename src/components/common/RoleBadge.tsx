import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { visuallyHidden } from "@mui/utils";
import { useTranslations } from "next-intl";
import { roleColorSx } from "@/lib/constants";
import { RADIUS } from "@/lib/radius";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface RoleBadgeProps {
  role: number;
  /** Variante del ruolo ("S", "T", "P", "R"), mostrata accanto al numero. */
  variant?: string | null;
  /** `medium` (24px) nelle liste, `large` (32px) negli hero e nei profili. */
  size?: "medium" | "large";
  /** Mostra la parola "Ruolo" prima del badge (di norma e' solo per i lettori di schermo). */
  showLabel?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Badge del ruolo Baskin (UX-11). Il **numero** e' l'elemento principale e si
 * legge anche senza colore (in bianco e nero, o per chi non distingue le tinte);
 * "Ruolo" e' per i lettori di schermo, oppure visibile con `showLabel`.
 * Unico punto che disegna il ruolo: il colore arriva da `roleColorSx`.
 *
 * Niente "use client" e niente `sx` a funzione: si usa anche nei Server Component.
 */
export default function RoleBadge({
  role,
  variant = null,
  size = "medium",
  showLabel = false,
  sx,
}: RoleBadgeProps) {
  const t = useTranslations("roles");
  const box = size === "large" ? 32 : 24;
  return (
    <Box
      component="span"
      sx={[
        {
          // Ancora per il testo nascosto (UX-20): senza, lo span assoluto si
          // posiziona rispetto a un antenato lontano e allarga la pagina su mobile.
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          verticalAlign: "middle",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {showLabel && (
        <Box
          component="span"
          aria-hidden="true"
          sx={{ typography: "caption", color: "text.secondary" }}
        >
          {t("roleWord")}
        </Box>
      )}
      {/* Per i soli lettori di schermo. Valori in px: nel `sx` `width: 1` vale 100%. */}
      <Box component="span" sx={visuallyHidden}>
        {t("sportRole", { n: role, v: variant ?? "" })}
      </Box>
      <Box
        component="span"
        aria-hidden="true"
        sx={{
          ...roleColorSx(role),
          minWidth: box,
          height: box,
          px: 0.75,
          borderRadius: RADIUS.sm,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          typography: size === "large" ? "body1" : "body2",
          fontWeight: FONT_WEIGHT.bold,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          // In tema scuro i colori dei ruoli stanno a meno di 3:1 dal fondo: il bordo li stacca.
          border: "1px solid",
          borderColor: "border.role",
          flexShrink: 0,
        }}
      >
        {role}
        {variant}
      </Box>
    </Box>
  );
}
