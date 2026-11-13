import { Box, Chip } from "@mui/material";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { HERO_TEXT } from "@/lib/palette";

/**
 * Gioco spento visto dallo staff (UX-70): un chip sulla fascia scura della
 * pagina, al posto della frase di avviso. Neutro, con l'occhio barrato.
 * L'icona sta nella `label` (mai nella prop `icon` da un Server Component).
 */
export default function PreviewChip({ label }: { label: string }) {
  return (
    <Chip
      variant="outlined"
      label={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
          <VisibilityOffIcon fontSize="small" aria-hidden />
          {label}
        </Box>
      }
      sx={{
        color: HERO_TEXT.primary,
        borderColor: HERO_TEXT.lineStrong,
        fontWeight: FONT_WEIGHT.semibold,
      }}
    />
  );
}
