import { Button } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SettingsIcon from "@mui/icons-material/Settings";
import { brandColor } from "@/lib/heroStyles";

interface StaffManageButtonProps {
  /** Pagina admin dove si gestisce l'entita' (es. `/admin/squadre/<id>/rosa`). */
  href: string;
  label: string;
}

/**
 * "Gestisci" per lo staff, in alto a destra negli hero scuri delle pagine
 * pubbliche: porta alla pagina admin dell'entita' invece di aprire un dialog
 * di modifica, cosi' c'e' una strada sola per gestirla (UX-23).
 *
 * Niente "use client" e niente `sx` a funzione: si usa nei Server Component.
 */
export default function StaffManageButton({ href, label }: StaffManageButtonProps) {
  return (
    // Pillola bassa con solo il bordo, come "Copia link" nel profilo giocatore:
    // e' un comando di servizio, non deve pesare quanto il titolo.
    <Button
      href={href}
      size="small"
      variant="outlined"
      startIcon={<SettingsIcon sx={{ fontSize: "16px !important" }} />}
      sx={{
        color: "common.white",
        typography: "caption",
        fontWeight: 700,
        lineHeight: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: 999,
        borderColor: alpha(brandColor.white, 0.45),
        bgcolor: alpha(brandColor.black, 0.2),
        backdropFilter: "blur(4px)",
        "& .MuiButton-startIcon": { mr: 0.5 },
        "&:hover": {
          borderColor: brandColor.white,
          bgcolor: alpha(brandColor.white, 0.1),
        },
      }}
    >
      {label}
    </Button>
  );
}
