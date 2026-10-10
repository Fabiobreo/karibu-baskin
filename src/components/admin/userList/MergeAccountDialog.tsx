"use client";
import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ROLE_LABELS_IT } from "@/lib/authRoles";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import PersonRow from "@/components/admin/people/PersonRow";
import type { UserEntry } from "@/components/admin/userList/userListShared";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

type UserRow = UserEntry & { kind: "user" };

interface MergeAccountDialogProps {
  /** L'account in attesa, quello con l'email giusta: sparisce. */
  source: UserRow;
  /** Tutti gli account: la scheda vera si cerca qui, nel browser. */
  candidates: UserRow[];
  currentUserId: string | null;
  currentSeason: string;
  onClose: () => void;
  /** Unione fatta: la lista va riletta. */
  onMerged: () => void;
}

const MAX_RESULTS = 8;

/** Quante parole della ricerca compaiono nel nome o nell'email. */
function matchScore(user: UserRow, words: string[]): number {
  const haystack = `${user.name ?? ""} ${user.email}`.toLowerCase();
  return words.filter((w) => haystack.includes(w)).length;
}

/**
 * Unisce un account in attesa alla scheda che lo staff aveva creato con
 * un'email sbagliata. Due passi: si sceglie la scheda, poi si legge cosa resta
 * e cosa sparisce. Non si annulla, quindi la conferma chiede una spunta.
 */
export default function MergeAccountDialog({
  source,
  candidates,
  currentUserId,
  currentSeason,
  onClose,
  onMerged,
}: MergeAccountDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { showToast } = useToast();
  const [query, setQuery] = useState(source.name ?? "");
  const [target, setTarget] = useState<UserRow | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceName = source.name ?? source.email;

  const results = useMemo(() => {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 2);
    if (words.length === 0) return [];
    return candidates
      .filter((u) => u.id !== source.id && u.id !== currentUserId)
      .map((u) => ({ user: u, score: matchScore(u, words) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((r) => r.user);
  }, [query, candidates, source.id, currentUserId]);

  function describe(user: UserRow): string {
    const team = user.teamMemberships.find((m) => m.team.season === currentSeason)?.team.name;
    return [
      user.email,
      ROLE_LABELS_IT[user.appRole],
      team,
      user.birthDate ? `nato nel ${new Date(user.birthDate).getFullYear()}` : null,
      user.hasSignedIn ? "ha già fatto l'accesso" : "mai entrato",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  async function merge() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id, targetId: target.id }),
      });
      if (!res.ok) throw new Error(`${await readError(res)} Non è cambiato nulla.`);
      showToast({
        message: `Fatto: ${target.name ?? sourceName} ora entra con ${source.email}`,
        severity: "success",
      });
      onMerged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di rete. Non è cambiato nulla.");
    } finally {
      setBusy(false);
    }
  }

  const targetName = target ? (target.name ?? target.email) : "";

  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle sx={{ fontWeight: FONT_WEIGHT.semibold }}>
        Unisci a una scheda esistente
      </DialogTitle>
      <DialogContent>
        {!target ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {sourceName} è entrato con {source.email}, ma in elenco c&apos;è già la sua scheda con
              un&apos;altra email? Scegli la scheda giusta.
            </Typography>
            <TextField
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca la scheda per nome o email"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                },
                htmlInput: { enterKeyHint: "search", autoComplete: "off" },
              }}
            />
            <Box sx={{ mt: 1 }}>
              {results.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 1 }}>
                  {query.trim().length < 2
                    ? "Scrivi il nome o l'email della scheda."
                    : "Nessuna scheda con questo nome."}
                </Typography>
              ) : (
                results.map((u) => (
                  <Box
                    key={u.id}
                    component="button"
                    type="button"
                    onClick={() => {
                      setTarget(u);
                      setChecked(false);
                      setError(null);
                    }}
                    sx={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      border: 0,
                      bgcolor: "transparent",
                      color: "inherit",
                      font: "inherit",
                      p: 0,
                      px: 1,
                      borderRadius: RADIUS.md,
                      cursor: "pointer",
                      "&:hover, &:focus-visible": { bgcolor: "action.hover" },
                    }}
                  >
                    <PersonRow
                      name={u.name ?? u.email}
                      image={u.image}
                      sportRole={u.sportRole}
                      meta={describe(u)}
                    />
                  </Box>
                ))
              )}
            </Box>
          </>
        ) : (
          <>
            <SummaryBlock title="Resta">
              <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                {targetName}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {[
                  ROLE_LABELS_IT[target.appRole],
                  target.sportRole ? `ruolo Baskin ${target.sportRole}` : null,
                  target.teamMemberships.find((m) => m.team.season === currentSeason)?.team.name,
                  target._count.registrations === 1
                    ? "1 allenamento"
                    : `${target._count.registrations} allenamenti`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, overflowWrap: "anywhere" }}>
                Email: <s>{target.email}</s> → <strong>{source.email}</strong>
              </Typography>
              {source._count.registrations > 0 && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Le iscrizioni fatte con l&apos;account nuovo ({source._count.registrations})
                  passano a questa scheda.
                </Typography>
              )}
            </SummaryBlock>
            <SummaryBlock title="Sparisce">
              <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                L&apos;account in attesa «{sourceName}», creato il{" "}
                {format(new Date(source.createdAt), "d MMM yyyy", { locale: it })}.
              </Typography>
            </SummaryBlock>
            {target.hasSignedIn && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Questa scheda è già stata usata per entrare. Controlla che non siano due persone
                diverse.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary">
              Da ora {targetName.split(" ")[0]} entra con {source.email} e ritrova tutto il suo
              storico. Non si può annullare.
            </Typography>
            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              }
              label="Ho controllato: è la stessa persona"
            />
            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {target ? (
          <>
            <Button onClick={() => setTarget(null)} disabled={busy} sx={{ mr: "auto" }}>
              Indietro
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={merge}
              disabled={!checked || busy}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
            >
              Unisci
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Annulla</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={FONT_WEIGHT.semibold}
        display="block"
        gutterBottom
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
