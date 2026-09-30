// Icone dei chip di ruolo utente e di stato atleta (UX-29). Stanno fuori da
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
 * Icona del chip del ruolo utente (UX-29). Il ruolo non ha un colore: il chip e'
 * contornato neutro e lo distinguono l'icona e la parola.
 */
export const ROLE_CHIP_ICONS: Record<AppRole, SvgIconComponent> = {
  GUEST: PersonOutlineIcon,
  ATHLETE: SportsBasketballIcon,
  PARENT: FamilyRestroomIcon,
  COACH: SportsIcon,
  ADMIN: AdminPanelSettingsIcon,
};

/** Icona del chip di stato atleta (UX-29): chip neutro, lo distingue l'icona. */
export const ATHLETE_STATUS_CHIP_ICONS: Record<AthleteStatus, SvgIconComponent> = {
  INACTIVE_SEASON: PauseCircleOutlineIcon, // pausa temporanea
  FORMER: HistoryIcon, // ex atleta
};
