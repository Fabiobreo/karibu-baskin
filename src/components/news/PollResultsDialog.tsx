"use client";

import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import InlineError from "@/components/common/InlineError";
import { readError } from "@/lib/fetchJson";
import { errorText } from "@/lib/networkError";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import type { PollResults } from "@/lib/polls/pollResults";

interface PollResultsDialogProps {
  /** Sondaggio da mostrare; null = chiuso. */
  pollId: string | null;
  onClose: () => void;
}

const votes = (n: number) => (n === 1 ? "1 voto" : `${n} voti`);

/** Risultati di un sondaggio per staff e dirigenti: voti per opzione e chi li ha dati. */
export default function PollResultsDialog({ pollId, onClose }: PollResultsDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const query = useQuery({
    queryKey: ["poll-results", pollId],
    enabled: !!pollId,
    queryFn: async (): Promise<PollResults> => {
      const res = await fetch(`/api/polls/${pollId}/results`);
      if (!res.ok) throw new Error(await readError(res));
      return res.json();
    },
  });
  const data = query.data;
  const closed = data?.closesAt ? new Date(data.closesAt) <= new Date() : false;

  return (
    <Dialog
      open={!!pollId}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      aria-labelledby="poll-results-title"
    >
      <DialogTitle id="poll-results-title" sx={{ pr: 7 }}>
        <Typography
          component="span"
          variant="h6"
          fontWeight={FONT_WEIGHT.bold}
          sx={{ display: "block" }}
        >
          Risultati del sondaggio
        </Typography>
        {data && (
          <Typography component="span" variant="body2" color="text.secondary">
            {data.question}
          </Typography>
        )}
        <IconButton
          onClick={onClose}
          aria-label="Chiudi"
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {query.isPending ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : query.isError ? (
          <InlineError
            title="Risultati non caricati."
            message={errorText(query.error, "Errore")}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        ) : data ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {data.voterCount === 0
                ? "Nessuno ha ancora votato."
                : data.voterCount === 1
                  ? "Ha votato 1 persona"
                  : `Hanno votato ${data.voterCount} persone`}
              {data.voterCount > 0 && data.multiSelect ? " (scelta multipla)" : ""}
              {data.voterCount > 0 ? ". " : " "}
              {data.closesAt
                ? `${closed ? "Chiuso il" : "Chiude il"} ${format(new Date(data.closesAt), "d MMM yyyy, HH:mm", { locale: it })}.`
                : "Aperto senza scadenza."}
            </Typography>
            {data.options.map((o, i) => (
              <Box key={o.id}>
                {i > 0 && <Divider sx={{ mb: 2 }} />}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 2,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={FONT_WEIGHT.semibold}>
                    {o.text}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {votes(o.count)}
                  </Typography>
                </Box>
                {o.voters.length > 0 ? (
                  <Box
                    component="ul"
                    sx={{
                      m: 0,
                      mt: 0.5,
                      pl: 2.5,
                      columnCount: { xs: 1, sm: 2 },
                      columnGap: 3,
                    }}
                  >
                    {o.voters.map((v) => (
                      <Typography key={v.userId} component="li" variant="body2">
                        {v.name}
                      </Typography>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Nessun voto
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
