"use client";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTranslations } from "next-intl";

interface QueryErrorStateProps {
  /** Messaggio specifico, es. "Non è stato possibile caricare gli iscritti."
   *  Omesso, ricade su un testo generico. */
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * Stato di errore per una lettura fallita.
 *
 * Esiste per una ragione precisa: quando una `useQuery` fallisce e il componente
 * ricade su un default vuoto, l'interfaccia afferma qualcosa di falso. Sulla
 * pagina di un allenamento "nessun iscritto" e "non sono riuscito a leggere gli
 * iscritti" portano a decisioni opposte, e un allenatore che guarda lo schermo
 * dieci minuti prima dell'allenamento merita di sapere quale dei due sta
 * leggendo. Vuoto, caricamento ed errore vanno tenuti distinti ovunque
 * alimentino una decisione operativa.
 */
export default function QueryErrorState({ message, onRetry, compact }: QueryErrorStateProps) {
  const t = useTranslations("common");

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: compact ? 2 : 4,
        textAlign: "center",
      }}
    >
      <CloudOffIcon sx={{ color: "text.disabled", fontSize: compact ? 24 : 32 }} />
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {message ?? t("loadFailed")}
      </Typography>
      {onRetry && (
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </Box>
  );
}
