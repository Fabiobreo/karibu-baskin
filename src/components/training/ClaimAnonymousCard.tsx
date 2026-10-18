"use client";

import {
  Alert,
  Paper,
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import WavingHandIcon from "@mui/icons-material/WavingHand";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { useToast } from "@/context/ToastContext";
import { FONT_WEIGHT } from "@/lib/fontWeight";

type Registration = {
  id: string;
  date: Date | string;
  dateSlug: string | null;
  /** Titolo dell'allenamento: da sola, la data non dice a cosa ti stai collegando. */
  title: string;
};

export default function ClaimAnonymousCard({ registrations }: { registrations: Registration[] }) {
  const router = useRouter();
  const t = useTranslations("claim");
  const dateLocale = useActiveDateLocale();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (dismissed) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleClaim() {
    if (selected.size === 0) return;
    setFailed(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/registrations/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [...selected] }),
        });
        // Prima un errore non diceva niente: la card restava com'era e
        // sembrava che il tocco non fosse arrivato.
        if (!res.ok) throw new Error(String(res.status));
        const { claimed, merged = 0 } = (await res.json()) as {
          claimed: number;
          merged?: number;
        };
        // Un avviso, non un messaggio nella card: il profilo si ricarica e la
        // card sparisce (o resta con le sole iscrizioni non scelte), quindi
        // un messaggio dentro la card non si vedeva mai.
        showToast({
          severity: "success",
          message: [
            claimed > 0
              ? t("successTitle", { count: claimed })
              : t("successMergedOnly", { count: merged }),
            claimed > 0 && merged > 0 ? t("mergedNote", { count: merged }) : null,
            t("successNote"),
          ]
            .filter(Boolean)
            .join(" "),
        });
        setSelected(new Set());
        router.refresh();
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ p: 2.5, mb: 3, borderColor: "primary.main", borderStyle: "dashed" }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
        {/* Non è un problema da segnalare, è un'occasione: il triangolo di
            avviso diceva la cosa sbagliata. */}
        <WavingHandIcon color="primary" sx={{ mt: 0.3, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} gutterBottom>
            {t("title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("found", { count: registrations.length })}
          </Typography>
          <Stack spacing={0.25} sx={{ mb: 2 }}>
            {registrations.map((r) => (
              <FormControlLabel
                key={r.id}
                control={
                  <Checkbox
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    size="small"
                    disabled={isPending}
                  />
                }
                label={
                  <Box
                    sx={{ display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={FONT_WEIGHT.semibold}
                      sx={{ cursor: "pointer" }}
                    >
                      {r.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ cursor: "pointer" }}>
                      {format(new Date(r.date), "d MMMM yyyy", { locale: dateLocale })}
                    </Typography>
                  </Box>
                }
                sx={{ ml: 0, alignItems: "center" }}
              />
            ))}
          </Stack>
          {failed && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {t("error")}
            </Alert>
          )}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleClaim}
              disabled={isPending || selected.size === 0}
              startIcon={isPending ? <CircularProgress size={14} /> : undefined}
            >
              {t("linkSelected", { count: selected.size })}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setDismissed(true)}
              disabled={isPending}
            >
              {t("notMe")}
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
