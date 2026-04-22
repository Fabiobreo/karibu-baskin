"use client";

import {
  Paper, Box, Typography, Button, Chip, Stack, CircularProgress,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Session = { id: string; date: Date | string; dateSlug: string | null };

export default function ClaimAnonymousCard({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [answered, setAnswered] = useState<"yes" | "no" | null>(null);
  const [claimed, setClaimed] = useState(0);

  if (answered === "no") return null;

  if (answered === "yes") {
    return (
      <Paper elevation={0} variant="outlined" sx={{ p: 2.5, mb: 3, borderColor: "success.main", bgcolor: "success.50" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <CheckCircleIcon color="success" />
          <Box>
            <Typography variant="body2" fontWeight={700} color="success.dark">
              Collegato! {claimed} {claimed === 1 ? "allenamento aggiunto" : "allenamenti aggiunti"} al tuo profilo.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Li trovi nel conteggio degli allenamenti.
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

  function handleYes() {
    startTransition(async () => {
      const res = await fetch("/api/registrations/claim", { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { claimed: number };
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
        <WarningIcon color="primary" sx={{ mt: 0.3, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={700} gutterBottom>
            Ti riconosco! Sei già stato/a agli allenamenti?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Abbiamo trovato {sessions.length === 1 ? "un allenamento" : `${sessions.length} allenamenti`} a cui si è iscritto qualcuno con il tuo stesso nome:
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
            {sessions.map((s) => (
              <Chip
                key={s.id}
                label={format(new Date(s.date), "d MMM yyyy", { locale: it })}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: "0.72rem" }}
              />
            ))}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Eri tu? Se sì, queste presenze verranno aggiunte al tuo profilo.
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleYes}
              disabled={isPending}
              startIcon={isPending ? <CircularProgress size={14} /> : undefined}
            >
              Sì, ero io
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setAnswered("no")}
              disabled={isPending}
            >
              No, non ero io
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
