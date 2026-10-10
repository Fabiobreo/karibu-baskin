"use client";
import { useState } from "react";
import { Alert, Box, Button, CircularProgress, IconButton, Paper, Typography } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import PersonRow from "@/components/admin/people/PersonRow";
import UserSearchPicker from "@/components/admin/people/UserSearchPicker";
import type { AdminPerson } from "@/components/admin/people/usePeopleSearch";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface ChildAccountSectionProps {
  childId: string;
  childName: string;
  /**
   * Com'è oggi: `false` nella scheda di un figlio senza account (si collega),
   * `true` nella scheda dell'account a cui la scheda figlio è legata (si
   * scollega).
   */
  linked: boolean;
  /** Etichetta sopra il riquadro: "Account" nella scheda figlio, "Scheda figlio" in quella dell'account. */
  label: string;
  /** I genitori: non possono essere l'account del figlio. */
  excludeIds?: string[];
  /** Collegato o scollegato: la lista va riletta (la persona cambia riga). */
  onChanged: () => void;
}

/**
 * Lega una scheda figlio all'account che il ragazzo si è fatto dopo, o toglie
 * il legame. Ha effetto subito, come la sezione Genitori: è un collegamento,
 * non un campo che aspetta "Salva". Lo storico resta sulla scheda.
 */
export default function ChildAccountSection({
  childId,
  childName,
  linked,
  label,
  excludeIds = [],
  onChanged,
}: ChildAccountSectionProps) {
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<AdminPerson | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstName = childName.split(" ")[0];

  async function link(user: AdminPerson) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/children/${childId}/account`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error(await readError(res));
      showToast({
        message: `Scheda di ${childName} collegata al suo account`,
        severity: "success",
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il collegamento");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/children/${childId}/account`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
      showToast({
        message: `Account scollegato dalla scheda di ${childName}`,
        severity: "success",
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante lo scollegamento");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={FONT_WEIGHT.semibold}
        display="block"
        gutterBottom
      >
        {label}
      </Typography>
      <Paper variant="outlined" sx={{ px: 1.5 }}>
        {linked ? (
          <>
            <PersonRow
              name={childName}
              sportRole={null}
              meta="Storico e squadra restano sulla scheda"
              trailing={
                confirmUnlink ? (
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Button
                      color="inherit"
                      onClick={() => setConfirmUnlink(false)}
                      disabled={busy}
                      sx={{ minHeight: 44 }}
                    >
                      No
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={unlink}
                      disabled={busy}
                      startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
                      sx={{ minHeight: 44 }}
                    >
                      Scollega
                    </Button>
                  </Box>
                ) : (
                  <IconButton
                    onClick={() => setConfirmUnlink(true)}
                    aria-label={`Scollega l'account dalla scheda di ${childName}`}
                    sx={{ width: 44, height: 44 }}
                  >
                    <LinkOffIcon />
                  </IconButton>
                )
              }
            />
            {confirmUnlink && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ py: 1 }}>
                L&apos;account resta, ma non vedrà più lo storico di {firstName}.
              </Typography>
            )}
          </>
        ) : (
          <Box sx={{ py: 1 }}>
            {picked ? (
              <Alert severity="info" icon={false}>
                <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                  {picked.name}
                </Typography>
                <Typography variant="caption" display="block" sx={{ overflowWrap: "anywhere" }}>
                  {picked.email}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {firstName} entrerà con questo account e vedrà il suo storico. I genitori
                  continuano a gestirlo.
                  {picked.appRole === "GUEST" && " L'account diventa Atleta."}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => link(picked)}
                    disabled={busy}
                    startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
                    sx={{ minHeight: 44 }}
                  >
                    Collega {firstName}
                  </Button>
                  <Button
                    color="inherit"
                    onClick={() => {
                      setPicked(null);
                      setError(null);
                    }}
                    disabled={busy}
                    sx={{ minHeight: 44 }}
                  >
                    Annulla
                  </Button>
                </Box>
              </Alert>
            ) : adding ? (
              <>
                <UserSearchPicker
                  autoFocus
                  onPick={setPicked}
                  excludeIds={excludeIds}
                  initialQuery={childName}
                  placeholder="Cerca l'account del ragazzo per nome o email"
                  emptyHint="Nessun account trovato. Prova con l'email che usa per entrare."
                />
                <Button color="inherit" onClick={() => setAdding(false)} sx={{ mt: 0.5 }}>
                  Annulla
                </Button>
              </>
            ) : (
              <>
                <Button
                  startIcon={<LinkIcon />}
                  onClick={() => setAdding(true)}
                  sx={{ minHeight: 44 }}
                >
                  Collega a un account
                </Button>
                <Typography variant="caption" color="text.secondary" display="block">
                  Se {firstName} ora entra nell&apos;app con un account suo.
                </Typography>
              </>
            )}
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
