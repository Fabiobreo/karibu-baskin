import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { roleColorSx } from "@/lib/constants";

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

// Testo per i soli lettori di schermo: fuori dalla vista ma nel flusso.
const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  p: 0,
  m: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

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
        { display: "inline-flex", alignItems: "center", gap: 0.75, verticalAlign: "middle" },
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
          borderRadius: 1.5,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          typography: size === "large" ? "body1" : "body2",
          fontWeight: 800,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          // In tema scuro le tinte stanno a meno di 3:1 dal fondo: il bordo le stacca.
          border: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        {role}
        {variant}
      </Box>
    </Box>
  );
}
