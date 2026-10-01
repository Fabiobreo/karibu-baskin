// Icone e colori dei chip di ruolo utente e di stato atleta (UX-29). Stanno fuori da
// `@/lib/constants`, che importano anche le rotte API e le immagini OG: li'
// le icone MUI non servono.
import type { AppRole, AthleteStatus } from "@prisma/client";
import type { SvgIconComponent } from "@mui/icons-material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SportsIcon from "@mui/icons-material/Sports";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import HistoryIcon from "@mui/icons-material/History";

/**
 * Icona del chip del ruolo utente. Il colore (`appRoleChipSx`) non e' mai
 * l'unico segnale: icona e parola ci sono sempre.
 */
export const ROLE_CHIP_ICONS: Record<AppRole, SvgIconComponent> = {
  GUEST: PersonOutlineIcon,
  ATHLETE: SportsBasketballIcon,
  PARENT: FamilyRestroomIcon,
  COACH: SportsIcon,
  ADMIN: AdminPanelSettingsIcon,
};

/**
 * `sx` del chip del ruolo utente (01/10): tonale per atleta, genitore e
 * allenatore (`palette.appRole`), nero del marchio pieno per l'admin, neutro
 * contornato per l'ospite. Solo token del tema: va bene anche nei Server
 * Component. Il chip va usato con `variant="outlined"` per l'ospite e
 * `"filled"` per gli altri (`appRoleChipVariant`).
 */
export function appRoleChipSx(role: AppRole) {
  if (role === "GUEST") return { "& .MuiChip-icon": { color: "text.secondary" } };
  if (role === "ADMIN") {
    return {
      bgcolor: "secondary.main",
      color: "secondary.contrastText",
      "& .MuiChip-icon": { color: "inherit" },
    };
  }
  return {
    bgcolor: `appRole.${role}.bg`,
    color: `appRole.${role}.fg`,
    "& .MuiChip-icon": { color: "inherit" },
  };
}

export function appRoleChipVariant(role: AppRole): "outlined" | "filled" {
  return role === "GUEST" ? "outlined" : "filled";
}

/** Icona del chip di stato atleta (UX-29): chip neutro, lo distingue l'icona. */
export const ATHLETE_STATUS_CHIP_ICONS: Record<AthleteStatus, SvgIconComponent> = {
  INACTIVE_SEASON: PauseCircleOutlineIcon, // pausa temporanea
  FORMER: HistoryIcon, // ex atleta
};
