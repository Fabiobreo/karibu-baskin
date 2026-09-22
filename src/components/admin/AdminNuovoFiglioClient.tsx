"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import type { Gender } from "@prisma/client";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { ROLE_LABELS_IT } from "@/lib/constants";
import type { AdminPerson } from "@/components/admin/people/usePeopleSearch";
import PersonRow from "@/components/admin/people/PersonRow";
import RolePicker from "@/components/admin/people/RolePicker";
import ExistingChildMatches from "@/components/admin/people/ExistingChildMatches";
import UserSearchPicker from "@/components/admin/people/UserSearchPicker";

interface ChildDraft {
  name: string;
  gender: Gender | null;
  birthDate: string;
  sportRole: number | null;
  parentalConsent: boolean;
}

const EMPTY_CHILD: ChildDraft = {
  name: "",
  gender: null,
  birthDate: "",
  sportRole: null,
  parentalConsent: false,
};

interface Created {
  name: string;
  parentName: string;
  parentPromoted: boolean;
  /**
   * new: figlio creato ora; shared: figlio già registrato, collegato anche a
   * questo genitore; account: utente con account, ora figlio di questo genitore.
   */
  outcome: "new" | "shared" | "account";
}

/**
 * Lo staff crea un figlio e lo collega a un genitore, in due passi sulla
 * stessa pagina: prima il genitore (ricerca), poi i dati del figlio.
 *
 * Pensato per inserire molti figli di fila: dopo il salvataggio il genitore
 * resta scelto e "Un altro figlio di …" riporta al nome, che è il campo da
 * cambiare. Sul telefono ogni scelta è un pulsante largo, niente menu.
 *
 * Mentre si scrive il nome compaiono i figli già registrati con un nome
 * simile (`ExistingChildMatches`): per il secondo genitore si collega quello
 * esistente invece di creare un doppione.
 */
export default function AdminNuovoFiglioClient({
  initialParent,
}: {
  initialParent: AdminPerson | null;
}) {
  const { showToast } = useToast();
  const nameRef = useRef<HTMLInputElement>(null);

  const [parent, setParent] = useState<AdminPerson | null>(initialParent);
  const [promoteParent, setPromoteParent] = useState(true);
  const [child, setChild] = useState<ChildDraft>(EMPTY_CHILD);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  function set<K extends keyof ChildDraft>(key: K, value: ChildDraft[K]) {
    setChild((c) => ({ ...c, [key]: value }));
  }

  function chooseParent(p: AdminPerson) {
    setParent(p);
    setPromoteParent(true);
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  function anotherForSameParent() {
    setCreated(null);
    setChild(EMPTY_CHILD);
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  function anotherForNewParent() {
    setCreated(null);
    setChild(EMPTY_CHILD);
    setParent(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parent) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: parent.id,
          name: child.name,
          gender: child.gender,
          birthDate: child.birthDate || null,
          sportRole: child.sportRole,
          parentalConsent: child.parentalConsent,
          promoteParent: parent.appRole === "GUEST" && promoteParent,
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { name: string; parentPromoted: boolean };
      if (data.parentPromoted) setParent({ ...parent, appRole: "PARENT" });
      setCreated({
        name: data.name,
        parentName: parent.name,
        parentPromoted: data.parentPromoted,
        outcome: "new",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Errore durante la creazione",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function linkExisting(existing: AdminPerson) {
    if (!parent) return;
    setLinkingId(existing.id);
    try {
      const promote = parent.appRole === "GUEST" && promoteParent;
      // Figlio già registrato: si aggiunge un genitore alla sua scheda.
      // Utente con account: nasce la sua scheda figlio, legata all'account.
      const res =
        existing.kind === "child"
          ? await fetch(`/api/admin/children/${existing.id}/guardians`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: parent.id, promoteParent: promote }),
            })
          : await fetch("/api/admin/children/link-account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                parentId: parent.id,
                userId: existing.id,
                promoteParent: promote,
              }),
            });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { parentPromoted: boolean };
      if (data.parentPromoted) setParent({ ...parent, appRole: "PARENT" });
      setCreated({
        name: existing.name,
        parentName: parent.name,
        parentPromoted: data.parentPromoted,
        outcome: existing.kind === "child" ? "shared" : "account",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Errore durante il collegamento",
        severity: "error",
      });
    } finally {
      setLinkingId(null);
    }
  }

  // ── Conferma: il passo successivo più probabile è un altro figlio ────────
  if (created) {
    const firstName = created.parentName.split(" ")[0];
    return (
      <Paper elevation={2} sx={{ p: { xs: 2.5, md: 3 }, maxWidth: 560 }}>
        <Stack spacing={2} alignItems="flex-start">
          <CheckCircleIcon sx={{ fontSize: 44, color: "success.main" }} />
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {created.outcome === "shared"
                ? `${created.name} è collegato anche a ${firstName}`
                : created.outcome === "account"
                  ? `${created.name} ora è figlio di ${firstName}`
                  : `${created.name} è stato aggiunto`}
            </Typography>
            <Typography color="text.secondary">
              {created.outcome === "shared"
                ? `Stessa scheda, presenze e statistiche per tutti i genitori: ${created.parentName} lo trova nel suo profilo.`
                : created.outcome === "account"
                  ? `Continua a usare il suo account; ${created.parentName} lo trova nel suo profilo e può iscriverlo.`
                  : `Ora è collegato a ${created.parentName}, che lo trova nel suo profilo.`}
              {created.parentPromoted && ` ${firstName} adesso ha il ruolo Genitore.`}
            </Typography>
          </Box>
          <Stack spacing={1.25} sx={{ width: "100%" }}>
            <Button variant="contained" size="large" fullWidth onClick={anotherForSameParent}>
              Un altro figlio di {firstName}
            </Button>
            <Button variant="outlined" size="large" fullWidth onClick={anotherForNewParent}>
              Figlio di un altro genitore
            </Button>
            <Link href="/admin/utenti" style={{ textDecoration: "none" }}>
              <Button color="inherit" size="large" fullWidth>
                Torna agli utenti
              </Button>
            </Link>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, maxWidth: 560 }}>
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* ── 1. Genitore ─────────────────────────────────────────────── */}
          <Box>
            <StepTitle n={1}>Genitore</StepTitle>
            {parent ? (
              <>
                <Paper variant="outlined" sx={{ px: 1.5 }}>
                  <PersonRow
                    name={parent.name}
                    image={parent.image}
                    sportRole={null}
                    meta={[parent.email, parent.appRole && ROLE_LABELS_IT[parent.appRole]]
                      .filter(Boolean)
                      .join(" · ")}
                    trailing={
                      <Button
                        onClick={() => setParent(null)}
                        startIcon={<SwapHorizIcon />}
                        sx={{ minHeight: 44 }}
                      >
                        Cambia
                      </Button>
                    }
                  />
                </Paper>
                {parent.appRole === "GUEST" && (
                  <Alert severity="warning" sx={{ mt: 1.5 }}>
                    L&apos;account di {parent.name} è ancora in attesa: finché resta così non vede
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
                  </Alert>
                )}
              </>
            ) : (
              <UserSearchPicker autoFocus onPick={chooseParent} />
            )}
          </Box>

          {/* ── 2. Figlio: visibile solo col genitore scelto ────────────── */}
          <Box
            sx={{
              opacity: parent ? 1 : 0.45,
              pointerEvents: parent ? "auto" : "none",
              transition: "opacity 0.2s",
            }}
            aria-disabled={!parent}
          >
            <StepTitle n={2}>Figlio</StepTitle>
            <Stack spacing={2.5}>
              <TextField
                inputRef={nameRef}
                label="Nome e cognome"
                required
                fullWidth
                value={child.name}
                onChange={(e) => set("name", e.target.value)}
                disabled={!parent}
                slotProps={{ htmlInput: { autoCapitalize: "words", maxLength: 60 } }}
              />
              {parent && (
                <ExistingChildMatches
                  name={child.name}
                  parent={parent}
                  linkingId={linkingId}
                  onLink={linkExisting}
                />
              )}

              <Field label="Genere">
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={child.gender}
                  onChange={(_, v: Gender | null) => set("gender", v)}
                  disabled={!parent}
                  sx={{ "& .MuiToggleButton-root": { minHeight: 44, fontWeight: 700 } }}
                >
                  <ToggleButton value="MALE">Maschio</ToggleButton>
                  <ToggleButton value="FEMALE">Femmina</ToggleButton>
                </ToggleButtonGroup>
              </Field>

              <TextField
                label="Data di nascita"
                type="date"
                fullWidth
                value={child.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
                disabled={!parent}
                helperText="Senza data il figlio è trattato come minorenne (non compare in ricerca)."
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <Field label="Ruolo Baskin">
                <RolePicker
                  value={child.sportRole}
                  onChange={(r) => set("sportRole", r)}
                  allowNone
                  disabled={!parent}
                />
              </Field>

              <FormControlLabel
                sx={{ alignItems: "flex-start", mr: 0 }}
                control={
                  <Checkbox
                    checked={child.parentalConsent}
                    onChange={(e) => set("parentalConsent", e.target.checked)}
                    disabled={!parent}
                    sx={{ mt: -0.75 }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      Il genitore ha già dato il consenso al trattamento dei dati del figlio
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Per esempio con il modulo di tesseramento. Se non è così lascia vuoto: il
                      consenso risulterà non registrato.
                    </Typography>
                  </Box>
                }
              />
            </Stack>
          </Box>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={saving || !parent || !child.name.trim()}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <ChildCareIcon />}
          >
            {saving
              ? "Salvataggio..."
              : parent
                ? `Aggiungi a ${parent.name.split(" ")[0]}`
                : "Scegli prima il genitore"}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      component="h2"
      fontWeight={800}
      color="text.secondary"
      sx={{ display: "block", mb: 1, letterSpacing: "0.08em" }}
    >
      {n}. {children}
    </Typography>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}
