"use client";
import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  LinearProgress,
  Chip,
  Alert,
} from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import LockIcon from "@mui/icons-material/Lock";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

interface PollOption {
  id: string;
  text: string;
  order: number;
}

interface PollWidgetProps {
  pollId: string;
  question: string;
  multiSelect: boolean;
  closesAt: string | null;
  options: PollOption[];
  voteCounts: Record<string, number> | null; // popolato se poll chiuso, oppure per staff (anteprima)
  userVoteOptionIds: string[]; // voti attuali dell'utente loggato
  isLoggedIn: boolean;
  postSlug: string;
}

export default function PollWidget({
  pollId,
  question,
  multiSelect,
  closesAt,
  options,
  voteCounts,
  userVoteOptionIds,
  isLoggedIn,
  postSlug,
}: PollWidgetProps) {
  const [selected, setSelected] = useState<string[]>(userVoteOptionIds);
  const [saving, setSaving] = useState(false);
  const [hasVoted, setHasVoted] = useState(userVoteOptionIds.length > 0);
  const { showToast } = useToast();
  const router = useRouter();

  const now = new Date();
  const isClosed = closesAt ? new Date(closesAt) <= now : false;
  const showResults = voteCounts !== null;
  const isStaffPreview = showResults && !isClosed;

  const totalVotes = showResults ? Object.values(voteCounts ?? {}).reduce((a, b) => a + b, 0) : 0;

  function toggleOption(optionId: string) {
    if (multiSelect) {
      setSelected((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelected([optionId]);
    }
  }

  async function handleVote() {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=/news/${postSlug}`);
      return;
    }
    if (selected.length === 0) {
      showToast({ message: "Seleziona almeno un'opzione", severity: "warning" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds: selected }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Errore");
      setHasVoted(true);
      showToast({ message: "Voto registrato", severity: "success" });
      // Aggiorna i risultati lato server (anteprima staff o sondaggio chiuso)
      router.refresh();
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box
      sx={{
        mt: 4,
        p: 2.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "action.hover",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <HowToVoteIcon sx={{ color: "primary.main" }} fontSize="small" />
        <Typography variant="subtitle1" fontWeight={700}>
          Sondaggio
        </Typography>
        {isClosed && (
          <Chip
            icon={<LockIcon />}
            label="Chiuso"
            size="small"
            color="default"
            sx={{ ml: "auto" }}
          />
        )}
        {!isClosed && closesAt && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            Chiude {formatDistanceToNow(new Date(closesAt), { addSuffix: true, locale: it })}
          </Typography>
        )}
      </Box>

      <Typography variant="body1" fontWeight={500} sx={{ mb: 2 }}>
        {question}
      </Typography>

      {isStaffPreview && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Anteprima riservata allo staff — il sondaggio è ancora aperto, i risultati non sono
          visibili agli altri utenti.
        </Alert>
      )}

      {(() => {
        const resultsBlock = (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {isStaffPreview && (
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Risultati attuali
              </Typography>
            )}
            {options.map((opt) => {
              const count = voteCounts?.[opt.id] ?? 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const voted = userVoteOptionIds.includes(opt.id);
              return (
                <Box key={opt.id}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography
                      variant="body2"
                      fontWeight={voted ? 700 : 400}
                      sx={{ color: voted ? "primary.main" : "text.primary" }}
                    >
                      {opt.text}
                      {voted && " ✓"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pct}% ({count})
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "action.selected",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: voted ? "primary.main" : "text.secondary",
                      },
                    }}
                  />
                </Box>
              );
            })}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {totalVotes} {totalVotes === 1 ? "voto" : "voti"} totali
            </Typography>
          </Box>
        );

        const voteForm = (
          <Box>
            {isStaffPreview && (
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "block",
                  mb: 1,
                }}
              >
                Il tuo voto
              </Typography>
            )}
            {!isLoggedIn && (
              <Alert severity="info" sx={{ mb: 1.5 }}>
                Fai login per partecipare al sondaggio.
              </Alert>
            )}

            {multiSelect ? (
              <FormGroup>
                {options.map((opt) => (
                  <FormControlLabel
                    key={opt.id}
                    control={
                      <Checkbox
                        checked={selected.includes(opt.id)}
                        onChange={() => toggleOption(opt.id)}
                        disabled={!isLoggedIn || saving}
                        size="small"
                      />
                    }
                    label={opt.text}
                  />
                ))}
              </FormGroup>
            ) : (
              <RadioGroup value={selected[0] ?? ""} onChange={(e) => setSelected([e.target.value])}>
                {options.map((opt) => (
                  <FormControlLabel
                    key={opt.id}
                    value={opt.id}
                    control={<Radio size="small" disabled={!isLoggedIn || saving} />}
                    label={opt.text}
                  />
                ))}
              </RadioGroup>
            )}

            <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleVote}
                disabled={saving || (!isLoggedIn ? false : selected.length === 0)}
                startIcon={<HowToVoteIcon />}
              >
                {!isLoggedIn ? "Accedi per votare" : hasVoted ? "Aggiorna voto" : "Vota"}
              </Button>
              {hasVoted && !isClosed && (
                <Typography variant="caption" color="text.secondary">
                  Puoi modificare il tuo voto fino alla chiusura.
                </Typography>
              )}
            </Box>
          </Box>
        );

        if (isStaffPreview) {
          return (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: { xs: 3, md: 4 },
                alignItems: "flex-start",
              }}
            >
              {voteForm}
              {resultsBlock}
            </Box>
          );
        }
        return showResults ? resultsBlock : voteForm;
      })()}
    </Box>
  );
}
