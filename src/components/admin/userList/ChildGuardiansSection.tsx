"use client";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import PersonRow from "@/components/admin/people/PersonRow";
import UserSearchPicker from "@/components/admin/people/UserSearchPicker";
import type { AdminPerson } from "@/components/admin/people/usePeopleSearch";

interface Guardian {
  id: string;
  name: string | null;
  email: string;
}

interface ChildGuardiansSectionProps {
  childId: string;
  childName: string;
  guardians: Guardian[];
  /** Riceve la lista aggiornata, da riportare nella tabella. */
  onChange: (guardians: Guardian[]) => void;
}

/**
 * Genitori di un figlio, nella scheda di modifica dello staff. Aggiungere e
 * togliere hanno effetto subito (non aspettano "Salva"): sono collegamenti,
 * non campi del figlio. L'ultimo genitore non si toglie: il figlio resterebbe
 * senza nessuno che lo gestisca.
 *
 * Un genitore con l'account ancora in attesa (GUEST) passa da una conferma con
 * "Rendilo Genitore", come nella pagina Nuovo figlio: senza promozione non
 * vedrebbe il figlio.
 */
export default function ChildGuardiansSection({
  childId,
  childName,
  guardians,
  onChange,
}: ChildGuardiansSectionProps) {
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingGuest, setPendingGuest] = useState<AdminPerson | null>(null);
  const [promoteParent, setPromoteParent] = useState(true);

  function pick(user: AdminPerson) {
    if (user.appRole === "GUEST") {
      setPromoteParent(true);
      setPendingGuest(user);
    } else {
      void link(user, false);
    }
  }

  async function link(user: AdminPerson, promote: boolean) {
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/admin/children/${childId}/guardians`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, promoteParent: promote }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onChange([...guardians, { id: user.id, name: user.name, email: user.email ?? "" }]);
      setAdding(false);
      setPendingGuest(null);
      showToast({ message: `${user.name} ora è genitore di ${childName}`, severity: "success" });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Errore durante il collegamento",
        severity: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function unlink(g: Guardian) {
    setBusyId(g.id);
    try {
      const res = await fetch(`/api/admin/children/${childId}/guardians?userId=${g.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readError(res));
      onChange(guardians.filter((x) => x.id !== g.id));
      setConfirmId(null);
      showToast({
        message: `${g.name ?? g.email} scollegato da ${childName}`,
        severity: "success",
      });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Errore durante lo scollegamento",
        severity: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  const onlyOne = guardians.length <= 1;

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={600}
        display="block"
        gutterBottom
      >
        Genitori
      </Typography>
      <Paper variant="outlined" sx={{ px: 1.5 }}>
        {guardians.map((g) => (
          <PersonRow
            key={g.id}
            name={g.name ?? g.email}
            sportRole={null}
            meta={g.email}
            trailing={
              confirmId === g.id ? (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Button color="inherit" onClick={() => setConfirmId(null)} sx={{ minHeight: 44 }}>
                    No
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => unlink(g)}
                    disabled={busyId !== null}
                    startIcon={
                      busyId === g.id ? <CircularProgress size={16} color="inherit" /> : null
                    }
                    sx={{ minHeight: 44 }}
                  >
                    Scollega
                  </Button>
                </Box>
              ) : (
                <IconButton
                  onClick={() => setConfirmId(g.id)}
                  disabled={onlyOne || busyId !== null}
                  aria-label={`Scollega ${g.name ?? g.email}`}
                  title={
                    onlyOne ? "È l'unico genitore: per toglierlo elimina il figlio" : undefined
                  }
                  sx={{ width: 44, height: 44 }}
                >
                  <LinkOffIcon />
                </IconButton>
              )
            }
          />
        ))}
        <Box sx={{ py: 1 }}>
          {pendingGuest ? (
            <Alert severity="warning">
              L&apos;account di {pendingGuest.name} è ancora in attesa: finché resta così non vede
              il figlio né può iscriverlo.
              <FormControlLabel
                sx={{ display: "flex", mt: 0.5 }}
                control={
                  <Checkbox
                    checked={promoteParent}
                    onChange={(e) => setPromoteParent(e.target.checked)}
                  />
                }
                label="Rendilo Genitore"
              />
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button
                  variant="contained"
                  onClick={() => link(pendingGuest, promoteParent)}
                  disabled={busyId !== null}
                  startIcon={
                    busyId === pendingGuest.id ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : null
                  }
                  sx={{ minHeight: 44 }}
                >
                  Collega {pendingGuest.name.split(" ")[0]}
                </Button>
                <Button
                  color="inherit"
                  onClick={() => setPendingGuest(null)}
                  disabled={busyId !== null}
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
                onPick={pick}
                excludeIds={guardians.map((g) => g.id)}
                placeholder="Cerca l'altro genitore per nome o email"
              />
              <Button color="inherit" onClick={() => setAdding(false)} sx={{ mt: 0.5 }}>
                Annulla
              </Button>
            </>
          ) : (
            <Button
              startIcon={<PersonAddAlt1Icon />}
              onClick={() => setAdding(true)}
              sx={{ minHeight: 44 }}
            >
              Aggiungi un genitore
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
