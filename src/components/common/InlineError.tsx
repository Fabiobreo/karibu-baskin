"use client";
import { Alert, Box, Button, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTranslations } from "next-intl";

interface InlineErrorProps {
  /** Cosa non e' andato, in una riga ("Iscrizione non salvata."). In grassetto. */
  title?: string;
  /** Il motivo, di solito il messaggio del server. */
  message: string;
  /** Ripete l'operazione fallita. Senza, niente "Riprova". */
  onRetry?: () => void;
  /** Chiude l'avviso. Senza, resta finche' non si riprova. */
  onClose?: () => void;
  /** Riprova disabilitato mentre l'operazione e' in corso. */
  retrying?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Errore accanto all'elemento che lo ha causato (UX-25): sotto la riga, il
 * pulsante o il modulo, non in un angolo dello schermo. Resta finche' non si
 * riprova o si chiude: un avviso che sparisce da solo fa credere che
 * l'operazione sia andata (UX-05).
 *
 * `role="alert"` (di `Alert` MUI): il lettore di schermo lo annuncia appena
 * compare.
 */
export default function InlineError({
  title,
  message,
  onRetry,
  onClose,
  retrying = false,
  sx,
}: InlineErrorProps) {
  const t = useTranslations("common");
  return (
    <Alert
      severity="error"
      // Con `action` MUI non mostra la X di `onClose`: i due bottoni li mettiamo noi.
      onClose={onRetry ? undefined : onClose}
      closeText={t("close")}
      sx={[{ my: 1 }, ...(Array.isArray(sx) ? sx : [sx])]}
      action={
        onRetry ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Button
              color="inherit"
              size="small"
              disabled={retrying}
              onClick={onRetry}
              sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
            >
              {t("retry")}
            </Button>
            {onClose && (
              <IconButton color="inherit" size="small" onClick={onClose} aria-label={t("close")}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ) : undefined
      }
    >
      {title && (
        <Box component="span" sx={{ fontWeight: 700 }}>
          {title}
        </Box>
      )}
      {title && " "}
      {message}
    </Alert>
  );
}
