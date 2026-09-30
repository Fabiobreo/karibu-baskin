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
      // Bottone fantasma del tema (UX-30): outlined + color inherit, in bianco
      // perche' sta sempre sopra un hero scuro.
      variant="outlined"
      color="inherit"
      startIcon={<SettingsIcon sx={{ fontSize: "16px !important" }} />}
      sx={{
        color: "common.white",
        typography: "caption",
        px: 1.5,
        "& .MuiButton-startIcon": { mr: 0.5 },
      }}
    >
      {label}
    </Button>
  );
}
