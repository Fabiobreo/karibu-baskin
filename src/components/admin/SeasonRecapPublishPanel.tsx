"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Typography,
} from "@mui/material";
import CelebrationIcon from "@mui/icons-material/Celebration";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { readError } from "@/lib/fetchJson";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface SeasonRecapPublishPanelProps {
  season: string;
  /** ISO, o null se i riepiloghi non sono pubblicati. */
  publishedAt: string | null;
  /** Pubblicare e ritirare sono dell'admin; l'allenatore legge e apre l'anteprima. */
  isAdmin: boolean;
  onChange: (season: string, publishedAt: string | null) => void;
}

const DATE_FMT = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Rome",
});

/**
 * "La tua stagione" (UX-60): l'admin pubblica i riepiloghi personali di una
 * stagione, di norma a fine maggio. Prima li vedono solo allenatori e admin
 * (l'anteprima); dopo ognuno vede il suo nel profilo, e con la spunta accesa
 * parte un avviso a chi ha dei dati nella stagione.
 */
export default function SeasonRecapPublishPanel({
  season,
  publishedAt,
  isAdmin,
  onChange,
}: SeasonRecapPublishPanelProps) {
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [notify, setNotify] = useState(true);

  const publish = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/competitive-teams/seasons/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, notify }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return (await res.json()) as { recapPublishedAt: string };
    },
    onSuccess: (data) => {
      onChange(season, data.recapPublishedAt);
      showToast({
        message: notify ? "Riepiloghi pubblicati, avviso in partenza" : "Riepiloghi pubblicati",
        severity: "success",
      });
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  const unpublish = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/competitive-teams/seasons/recap?season=${season}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readError(res));
    },
    onSuccess: () => {
      onChange(season, null);
      showToast({ message: "Riepiloghi ritirati", severity: "success" });
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  const busy = publish.isPending || unpublish.isPending;

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      {ConfirmDialog}
      <Typography
        variant="body1"
        fontWeight={FONT_WEIGHT.semibold}
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <CelebrationIcon fontSize="small" sx={{ color: "primary.main" }} aria-hidden />
        La tua stagione {season}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {publishedAt
          ? `Riepiloghi pubblicati il ${DATE_FMT.format(new Date(publishedAt))}: ognuno vede il suo nel profilo.`
          : "Il riepilogo personale di fine stagione: presenze, partite, punti e traguardi. Finché non è pubblicato lo vedono solo allenatori e admin, con “Anteprima riepilogo” nella scheda di ogni utente. Prima di pubblicare, controlla che le presenze degli allenamenti siano segnate."}
      </Typography>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mt: 2 }}>
        <Button
          variant="outlined"
          size="small"
          href={`/profilo/stagione/${season}`}
          sx={TOUCH_TARGET_ON_PHONE}
        >
          {publishedAt ? "Apri il tuo" : "Anteprima del tuo"}
        </Button>
        {isAdmin && !publishedAt && (
          <>
            <Button
              variant="outlined"
              size="small"
              disabled={busy}
              startIcon={publish.isPending ? <CircularProgress size={14} /> : undefined}
              sx={TOUCH_TARGET_ON_PHONE}
              onClick={() =>
                openConfirm(
                  `Pubblicare i riepiloghi ${season}?`,
                  notify
                    ? "Ognuno vedrà il suo riepilogo nel profilo, e chi ha presenze o partite in questa stagione (con i genitori) riceverà un avviso. L'avviso parte una volta sola."
                    : "Ognuno vedrà il suo riepilogo nel profilo. Nessun avviso.",
                  () => publish.mutate(),
                  { confirmLabel: "Pubblica", confirmColor: "primary" }
                )
              }
            >
              Pubblica i riepiloghi
            </Button>
            <FormControlLabel
              control={
                <Checkbox
                  checked={notify}
                  onChange={(e) => setNotify(e.target.checked)}
                  disabled={busy}
                />
              }
              label="Avvisa chi ha dati nella stagione"
            />
          </>
        )}
        {isAdmin && publishedAt && (
          <Button
            size="small"
            disabled={busy}
            sx={TOUCH_TARGET_ON_PHONE}
            onClick={() =>
              openConfirm(
                `Ritirare i riepiloghi ${season}?`,
                "Le pagine dei riepiloghi tornano invisibili, salvo che allo staff. Gli avvisi già arrivati restano, ma porteranno a una pagina che non c'è.",
                () => unpublish.mutate(),
                { confirmLabel: "Ritira" }
              )
            }
          >
            Ritira la pubblicazione
          </Button>
        )}
      </Box>
    </Paper>
  );
}
