"use client";

import {
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { alpha } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";

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
  const [isPending, startTransition] = useTransition();
  const [answered, setAnswered] = useState<"yes" | "no" | null>(null);
  const [claimed, setClaimed] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set(registrations.map((r) => r.id)));

  if (answered === "no") return null;

  if (answered === "yes") {
    return (
      <Paper
        elevation={0}
        variant="outlined"
        sx={(theme) => ({
          p: 2.5,
          mb: 3,
          borderColor: "success.main",
          bgcolor: alpha(theme.palette.success.main, 0.08),
        })}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <CheckCircleIcon color="success" />
          <Box>
            <Typography variant="body2" fontWeight={700} color="success.dark">
              {t("successTitle", { count: claimed })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("successNote")}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

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
    startTransition(async () => {
      const res = await fetch("/api/registrations/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (res.ok) {
        const data = (await res.json()) as { claimed: number };
        setClaimed(data.claimed);
        setAnswered("yes");
        router.refresh();
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
          <Typography variant="body2" fontWeight={700} gutterBottom>
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
                    <Typography variant="body2" fontWeight={700} sx={{ cursor: "pointer" }}>
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
              onClick={() => setAnswered("no")}
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
