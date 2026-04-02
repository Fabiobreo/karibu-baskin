"use client";
import { useState } from "react";
import {
  Box, TextField, Button, Typography, List, ListItem,
  ListItemText, ListItemButton, IconButton, Paper, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, Stack, Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import SearchIcon from "@mui/icons-material/Search";
import EmailIcon from "@mui/icons-material/Email";
import BadgeIcon from "@mui/icons-material/Badge";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useToast } from "@/context/ToastContext";
import { ROLE_COLORS, GENDER_LABELS, sportRoleLabel } from "@/lib/constants";
import type { Gender } from "@prisma/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// ── Tipi ─────────────────────────────────────────────────────────────────────

export interface ChildData {
  id: string;
  name: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  gender: Gender | null;
  birthDate: string | Date | null;
  userId: string | null;
}

interface FoundUser {
  id: string;
  name: string | null;
  gender: string | null;
  birthDate: string | null;
}

type AddStep = "choice" | "email" | "name" | "confirm" | "sent" | "create";

interface EditFormState {
  name: string;
  gender: string;
  birthDate: string;
}

const EMPTY_EDIT_FORM: EditFormState = { name: "", gender: "", birthDate: "" };

// ── Helper ────────────────────────────────────────────────────────────────────

function formatBirthDate(d: string | null): string {
  if (!d) return "—";
  try { return format(new Date(d), "d MMMM yyyy", { locale: it }); } catch { return "—"; }
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ParentChildLinker({ initialChildren }: { initialChildren: ChildData[] }) {
  const [children, setChildren] = useState<ChildData[]>(initialChildren);

  // Add flow
  const [addStep, setAddStep] = useState<AddStep | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [nameResults, setNameResults] = useState<FoundUser[]>([]);
  const [nameSearched, setNameSearched] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", gender: "", birthDate: "" });
  const [creating, setCreating] = useState(false);

  // Edit existing child
  const [editTarget, setEditTarget] = useState<ChildData | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);

  // Other actions
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [linkTarget, setLinkTarget] = useState<ChildData | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);

  const { showToast } = useToast();

  // ── Add flow ───────────────────────────────────────────────────────────────

  function openAdd() {
    setAddStep("choice");
    setEmailInput("");
    setEmailError(null);
    setNameInput("");
    setNameResults([]);
    setNameSearched(false);
    setFoundUser(null);
    setCreateForm({ name: "", gender: "", birthDate: "" });
  }

  function closeAdd() { setAddStep(null); }

  async function handleSearchEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    setSearching(true);
    setEmailError(null);
    try {
      const res = await fetch(`/api/users/lookup?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const user: FoundUser = await res.json();
        setFoundUser(user);
        setAddStep("confirm");
      } else {
        setEmailError("Nessun utente trovato con questa email.");
      }
    } catch {
      setEmailError("Errore di rete, riprova.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSearchName() {
    const name = nameInput.trim();
    if (!name) return;
    setSearching(true);
    setNameResults([]);
    setNameSearched(false);
    try {
      const res = await fetch(`/api/users/lookup?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const results: FoundUser[] = await res.json();
        setNameResults(results);
      }
    } catch {
      showToast({ message: "Errore di ricerca", severity: "error" });
    } finally {
      setSearching(false);
      setNameSearched(true);
    }
  }

  function handleConfirmYes() {
    // Placeholder: in futuro invierà una mail di conferma al figlio/genitore
    setAddStep("sent");
  }

  async function handleCreateManually() {
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/users/me/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          gender: createForm.gender || null,
          birthDate: createForm.birthDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast({ message: data.error ?? "Errore nell'aggiunta", severity: "error" }); return; }
      setChildren((prev) => [...prev, data]);
      showToast({ message: `${data.name} aggiunto!`, severity: "success" });
      closeAdd();
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    } finally {
      setCreating(false);
    }
  }

  // ── Edit existing child ────────────────────────────────────────────────────

  function openEdit(child: ChildData) {
    setEditTarget(child);
    setEditForm({
      name: child.name,
      gender: child.gender ?? "",
      birthDate: child.birthDate ? new Date(child.birthDate).toISOString().slice(0, 10) : "",
    });
  }

  function closeEdit() { setEditTarget(null); setEditForm(EMPTY_EDIT_FORM); }

  async function handleSaveEdit() {
    if (!editTarget || !editForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/children/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          gender: editForm.gender || null,
          birthDate: editForm.birthDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast({ message: data.error ?? "Errore nel salvataggio", severity: "error" }); return; }
      setChildren((prev) => prev.map((c) => c.id === editTarget.id ? data : c));
      showToast({ message: `${data.name} aggiornato`, severity: "success" });
      closeEdit();
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  // ── Link / Unlink / Delete ────────────────────────────────────────────────

  async function handleLink() {
    if (!linkTarget || !linkEmail.trim()) return;
    setLinking(true);
    try {
      const res = await fetch(`/api/children/${linkTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkEmail: linkEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { showToast({ message: data.error ?? "Errore nel collegamento", severity: "error" }); return; }
      setChildren((prev) => prev.map((c) => c.id === linkTarget.id ? { ...c, userId: data.userId } : c));
      showToast({ message: `Account collegato a ${linkTarget.name}`, severity: "success" });
      setLinkTarget(null);
      setLinkEmail("");
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(child: ChildData) {
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlinkAccount: true }),
      });
      if (!res.ok) { showToast({ message: "Errore nello scollegamento", severity: "error" }); return; }
      setChildren((prev) => prev.map((c) => c.id === child.id ? { ...c, userId: null } : c));
      showToast({ message: `Account scollegato da ${child.name}`, severity: "info" });
    } catch {
      showToast({ message: "Errore di rete", severity: "error" });
    }
  }

  async function handleDelete(child: ChildData) {
    setDeletingId(child.id);
    try {
      await fetch(`/api/children/${child.id}`, { method: "DELETE" });
      setChildren((prev) => prev.filter((c) => c.id !== child.id));
      showToast({ message: `${child.name} rimosso`, severity: "info" });
    } catch {
      showToast({ message: "Errore durante la rimozione", severity: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Titoli dialog add ─────────────────────────────────────────────────────

  const ADD_TITLES: Record<AddStep, string> = {
    choice:  "Aggiungi figlio/a",
    email:   "Cerca per email",
    name:    "Cerca per nome",
    confirm: "Conferma",
    sent:    "Richiesta inviata",
    create:  "Crea manualmente",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      {children.length > 0 ? (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <List disablePadding>
            {children.map((child, idx) => (
              <ListItem
                key={child.id}
                divider={idx < children.length - 1}
                secondaryAction={
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {child.userId ? (
                      <IconButton size="small" onClick={() => handleUnlink(child)} title="Scollega account">
                        <LinkOffIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton size="small" color="primary" onClick={() => { setLinkTarget(child); setLinkEmail(""); }} title="Collega account">
                        <LinkIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={() => openEdit(child)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(child)} disabled={deletingId === child.id}>
                      {deletingId === child.id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="body2" fontWeight={600}>{child.name}</Typography>
                      {child.sportRole && (
                        <Chip label={sportRoleLabel(child.sportRole, child.sportRoleVariant)} size="small"
                          sx={{ bgcolor: ROLE_COLORS[child.sportRole], color: "#fff", fontWeight: 700, fontSize: "0.7rem" }} />
                      )}
                      {child.gender && (
                        <Typography variant="caption" color="text.secondary">{GENDER_LABELS[child.gender]}</Typography>
                      )}
                      {child.userId
                        ? <Chip label="Account collegato" size="small" color="success" variant="outlined" sx={{ fontSize: "0.65rem", height: 18 }} />
                        : <Chip label="Senza account" size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 18, color: "text.disabled", borderColor: "divider" }} />
                      }
                    </Box>
                  }
                  primaryTypographyProps={{ component: "div" }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Nessun figlio aggiunto.
        </Typography>
      )}

      <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={openAdd} size="small">
        Aggiungi figlio/a
      </Button>

      {/* ── Dialog collega account ── */}
      <Dialog open={!!linkTarget} onClose={() => { setLinkTarget(null); setLinkEmail(""); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Collega account — {linkTarget?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Inserisci l&apos;email dell&apos;account Google con cui {linkTarget?.name} si logga nell&apos;app.
          </Typography>
          <TextField
            label="Email account" type="email" value={linkEmail}
            onChange={(e) => setLinkEmail(e.target.value)}
            fullWidth size="small" autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleLink()}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Una volta collegati, il genitore può iscrivere il figlio agli allenamenti e viceversa.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setLinkTarget(null); setLinkEmail(""); }} disabled={linking}>Annulla</Button>
          <Button variant="contained" onClick={handleLink} disabled={linking || !linkEmail.trim()}
            startIcon={linking ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />}>
            {linking ? "Collegamento..." : "Collega"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog modifica figlio ── */}
      <Dialog open={!!editTarget} onClose={closeEdit} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Modifica — {editTarget?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Nome e cognome *" value={editForm.name}
              onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
              fullWidth size="small" inputProps={{ maxLength: 60 }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                Genere
              </Typography>
              <Select fullWidth size="small" displayEmpty value={editForm.gender}
                onChange={(e) => setEditForm((s) => ({ ...s, gender: e.target.value }))}>
                <MenuItem value=""><em>Non specificato</em></MenuItem>
                <MenuItem value="MALE">Maschio</MenuItem>
                <MenuItem value="FEMALE">Femmina</MenuItem>
              </Select>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                Data di nascita
              </Typography>
              <TextField fullWidth size="small" type="date" value={editForm.birthDate}
                onChange={(e) => setEditForm((s) => ({ ...s, birthDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeEdit} disabled={saving}>Annulla</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving || !editForm.name.trim()}>
            {saving ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog aggiungi (multi-step) ── */}
      <Dialog open={addStep !== null} onClose={closeAdd} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {addStep ? ADD_TITLES[addStep] : ""}
        </DialogTitle>

        <DialogContent>

          {/* Step: scelta metodo */}
          {addStep === "choice" && (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Il tuo figlio/a è già registrato/a nell&apos;app? Cercalo, altrimenti crealo manualmente.
              </Typography>
              <Button
                variant="outlined" fullWidth size="large"
                startIcon={<EmailIcon />}
                onClick={() => { setEmailInput(""); setEmailError(null); setAddStep("email"); }}
                sx={{ justifyContent: "flex-start", py: 1.5 }}
              >
                <Box sx={{ textAlign: "left" }}>
                  <Typography variant="body2" fontWeight={600}>Cerca per email</Typography>
                  <Typography variant="caption" color="text.secondary">Inserisci l&apos;email del suo account</Typography>
                </Box>
              </Button>
              <Button
                variant="outlined" fullWidth size="large"
                startIcon={<BadgeIcon />}
                onClick={() => { setNameInput(""); setNameResults([]); setNameSearched(false); setAddStep("name"); }}
                sx={{ justifyContent: "flex-start", py: 1.5 }}
              >
                <Box sx={{ textAlign: "left" }}>
                  <Typography variant="body2" fontWeight={600}>Cerca per nome e cognome</Typography>
                  <Typography variant="caption" color="text.secondary">Cerca tra gli utenti già registrati</Typography>
                </Box>
              </Button>
              <Button
                variant="outlined" fullWidth size="large"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => { setCreateForm({ name: "", gender: "", birthDate: "" }); setAddStep("create"); }}
                sx={{ justifyContent: "flex-start", py: 1.5 }}
              >
                <Box sx={{ textAlign: "left" }}>
                  <Typography variant="body2" fontWeight={600}>Crea manualmente</Typography>
                  <Typography variant="caption" color="text.secondary">Non è ancora registrato/a nell&apos;app</Typography>
                </Box>
              </Button>
            </Stack>
          )}

          {/* Step: ricerca email */}
          {addStep === "email" && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Cerca prima se il tuo figlio/a è già registrato/a nell&apos;app tramite la sua email.
              </Typography>
              <TextField
                label="Email" type="email" value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setEmailError(null); }}
                fullWidth size="small" autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSearchEmail()}
                error={!!emailError}
              />
              {emailError && (
                <Alert severity="warning" sx={{ py: 0.5 }}>{emailError}</Alert>
              )}
            </Stack>
          )}

          {/* Step: ricerca per nome */}
          {addStep === "name" && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Inserisci nome e cognome del tuo figlio/a.
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  label="Nome e cognome" value={nameInput}
                  onChange={(e) => { setNameInput(e.target.value); setNameSearched(false); }}
                  fullWidth size="small" autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSearchName()}
                />
                <Button variant="contained" size="small" onClick={handleSearchName}
                  disabled={searching || !nameInput.trim()} sx={{ flexShrink: 0, minWidth: 44, px: 1 }}>
                  {searching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                </Button>
              </Box>
              {nameSearched && nameResults.length > 0 && (
                <List disablePadding sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                  {nameResults.map((u, idx) => (
                    <ListItem key={u.id} disablePadding divider={idx < nameResults.length - 1}>
                      <ListItemButton onClick={() => { setFoundUser(u); setAddStep("confirm"); }}>
                        <ListItemText
                          primary={u.name ?? "—"}
                          secondary={[
                            u.gender ? GENDER_LABELS[u.gender as Gender] : null,
                            u.birthDate ? formatBirthDate(u.birthDate) : null,
                          ].filter(Boolean).join(" · ")}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
              {nameSearched && nameResults.length === 0 && (
                <>
                  <Alert severity="info" sx={{ py: 0.5 }}>Nessun risultato trovato.</Alert>
                  <Button variant="outlined" size="small" startIcon={<PersonAddIcon />}
                    onClick={() => {
                      setCreateForm({ name: nameInput, gender: "", birthDate: "" });
                      setAddStep("create");
                    }}>
                    Crea manualmente
                  </Button>
                </>
              )}
            </Stack>
          )}

          {/* Step: conferma utente trovato */}
          {addStep === "confirm" && foundUser && (
            <Stack spacing={2} sx={{ mt: 1, alignItems: "center", textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Sei il genitore di questa persona?
              </Typography>
              <Paper variant="outlined" sx={{ p: 2.5, width: "100%" }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {foundUser.name ?? "—"}
                </Typography>
                {foundUser.gender && (
                  <Typography variant="body2" color="text.secondary">
                    {GENDER_LABELS[foundUser.gender as Gender]}
                  </Typography>
                )}
                {foundUser.birthDate && (
                  <Typography variant="body2" color="text.secondary">
                    Nato/a il {formatBirthDate(foundUser.birthDate)}
                  </Typography>
                )}
              </Paper>
            </Stack>
          )}

          {/* Step: richiesta inviata */}
          {addStep === "sent" && (
            <Stack spacing={2} sx={{ mt: 1, alignItems: "center", textAlign: "center", py: 1 }}>
              <CheckCircleOutlineIcon color="success" sx={{ fontSize: 56 }} />
              <Typography variant="body1" fontWeight={700}>Richiesta inviata!</Typography>
              <Typography variant="body2" color="text.secondary">
                La richiesta di collegamento è stata inviata.
                Ti avviseremo quando <strong>{foundUser?.name}</strong> la confermerà.
              </Typography>
            </Stack>
          )}

          {/* Step: crea manualmente */}
          {addStep === "create" && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                label="Nome e cognome *" value={createForm.name}
                onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                fullWidth size="small" autoFocus inputProps={{ maxLength: 60 }}
              />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                  Genere
                </Typography>
                <Select fullWidth size="small" displayEmpty value={createForm.gender}
                  onChange={(e) => setCreateForm((s) => ({ ...s, gender: e.target.value }))}>
                  <MenuItem value=""><em>Non specificato</em></MenuItem>
                  <MenuItem value="MALE">Maschio</MenuItem>
                  <MenuItem value="FEMALE">Femmina</MenuItem>
                </Select>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                  Data di nascita
                </Typography>
                <TextField fullWidth size="small" type="date" value={createForm.birthDate}
                  onChange={(e) => setCreateForm((s) => ({ ...s, birthDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Il ruolo Baskin verrà assegnato dall&apos;allenatore.
              </Typography>
            </Stack>
          )}

        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {addStep === "choice" && (
            <Button onClick={closeAdd}>Annulla</Button>
          )}
          {addStep === "email" && (
            <>
              <Button onClick={() => setAddStep("choice")}>Indietro</Button>
              <Button variant="contained" onClick={handleSearchEmail}
                disabled={searching || !emailInput.trim()}
                startIcon={searching ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}>
                {searching ? "Ricerca..." : "Cerca"}
              </Button>
            </>
          )}
          {addStep === "name" && (
            <Button onClick={() => setAddStep("choice")}>Indietro</Button>
          )}
          {addStep === "confirm" && (
            <>
              <Button onClick={() => setAddStep("choice")}>No, riprova</Button>
              <Button variant="contained" onClick={handleConfirmYes}>
                Sì, è mio figlio/a
              </Button>
            </>
          )}
          {addStep === "sent" && (
            <Button variant="contained" onClick={closeAdd}>Chiudi</Button>
          )}
          {addStep === "create" && (
            <>
              <Button onClick={() => setAddStep("choice")}>Indietro</Button>
              <Button variant="contained" onClick={handleCreateManually}
                disabled={creating || !createForm.name.trim()}>
                {creating ? "Salvataggio..." : "Aggiungi"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
