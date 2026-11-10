"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import TeamChip from "@/components/teams/TeamChip";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { readError } from "@/lib/fetchJson";
import type { GironeOpponent, GironeTeam } from "@/lib/groups/gironeCalendar";

interface GironeTeamsCardProps {
  groupId: string;
  ourTeams: GironeTeam[];
  /** Le nostre squadre che hanno partite nel girone: non si tolgono. */
  ourTeamsInUse: ReadonlySet<string>;
  ourTeamsCatalog: GironeTeam[];
  teamsInGroup: GironeOpponent[];
  /** Le avversarie che hanno partite nel girone: non si tolgono. */
  opponentsInUse: ReadonlySet<string>;
  allOpponents: GironeOpponent[];
  onOurTeamsChange: (teams: GironeTeam[]) => void;
  onOpponentAdded: (team: GironeOpponent, created: boolean) => void;
  onOpponentRemoved: (teamId: string) => void;
}

/** Le squadre del girone, nostre e avversarie, in un solo riquadro. */
export default function GironeTeamsCard({
  groupId,
  ourTeams,
  ourTeamsInUse,
  ourTeamsCatalog,
  teamsInGroup,
  opponentsInUse,
  allOpponents,
  onOurTeamsChange,
  onOpponentAdded,
  onOpponentRemoved,
}: GironeTeamsCardProps) {
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [dialog, setDialog] = useState<"ours" | "opponent" | null>(null);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState({ name: "", city: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const ourIds = new Set(ourTeams.map((t) => t.id));
  const groupOppIds = new Set(teamsInGroup.map((t) => t.id));

  function open(kind: "ours" | "opponent") {
    setDialog(kind);
    setMode("existing");
    setSelected("");
    setForm({ name: "", city: "" });
    setError("");
  }

  async function addOurTeam() {
    const res = await fetch(`/api/groups/${groupId}/competitive-teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitiveTeamId: selected }),
    });
    if (!res.ok) throw new Error(await readError(res));
    const created = (await res.json()) as GironeTeam;
    onOurTeamsChange([...ourTeams, created]);
    showToast({ message: `"${created.name}" aggiunta al girone`, severity: "success" });
  }

  async function associate(team: GironeOpponent, created: boolean) {
    const res = await fetch(`/api/groups/${groupId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opposingTeamId: team.id }),
    });
    if (!res.ok) throw new Error(await readError(res));
    onOpponentAdded(team, created);
    showToast({
      message: created
        ? `"${team.name}" creata e aggiunta al girone`
        : `"${team.name}" aggiunta al girone`,
      severity: "success",
    });
  }

  async function addOpponent() {
    if (mode === "existing") {
      const found = allOpponents.find((o) => o.id === selected);
      if (!found) throw new Error("Scegli una squadra");
      await associate(found, false);
      return;
    }
    if (!form.name.trim()) throw new Error("Scrivi il nome");
    const res = await fetch("/api/opposing-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) throw new Error(await readError(res));
    const created = (await res.json()) as GironeOpponent;
    await associate({ ...created, city: created.city ?? null, slug: created.slug ?? null }, true);
  }

  async function submit() {
    setSaving(true);
    setError("");
    try {
      if (dialog === "ours") await addOurTeam();
      else await addOpponent();
      setDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  function removeOurTeam(t: GironeTeam) {
    openConfirm("Togli squadra", `Togliere "${t.name}" dal girone?`, async () => {
      const res = await fetch(`/api/groups/${groupId}/competitive-teams/${t.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onOurTeamsChange(ourTeams.filter((x) => x.id !== t.id));
        showToast({ message: "Squadra tolta dal girone", severity: "success" });
      } else showToast({ message: await readError(res), severity: "error" });
    });
  }

  function removeOpponent(o: GironeOpponent) {
    openConfirm("Togli squadra", `Togliere "${o.name}" dal girone?`, async () => {
      const res = await fetch(`/api/groups/${groupId}/teams/${o.id}`, { method: "DELETE" });
      if (res.ok) {
        onOpponentRemoved(o.id);
        showToast({ message: "Squadra tolta dal girone", severity: "success" });
      } else showToast({ message: await readError(res), severity: "error" });
    });
  }

  const canSubmit =
    !saving && (dialog === "ours" || mode === "existing" ? !!selected : !!form.name.trim());

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
        Squadre del girone ({ourTeams.length + teamsInGroup.length})
      </Typography>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Nostre
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2, alignItems: "center" }}>
        {ourTeams.map((t) => (
          <TeamChip
            key={t.id}
            name={t.name}
            color={t.color}
            onDelete={ourTeamsInUse.has(t.id) ? undefined : () => removeOurTeam(t)}
          />
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => open("ours")}>
          Aggiungi
        </Button>
      </Box>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Avversarie
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        {teamsInGroup.map((o) => (
          <Chip
            key={o.id}
            label={o.name}
            size="small"
            variant="outlined"
            onDelete={opponentsInUse.has(o.id) ? undefined : () => removeOpponent(o)}
          />
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => open("opponent")}>
          Aggiungi
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        Una squadra con partite nel girone non si toglie: prima vanno tolte le partite.
      </Typography>

      <ResponsiveDialog
        open={dialog !== null}
        onClose={saving ? undefined : () => setDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {dialog === "ours" ? "Aggiungi nostra squadra" : "Aggiungi avversaria"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {dialog === "opponent" && (
              <ToggleButtonGroup
                value={mode}
                exclusive
                size="small"
                fullWidth
                onChange={(_, v) => v && setMode(v)}
              >
                <ToggleButton value="existing">Da anagrafica</ToggleButton>
                <ToggleButton value="new">Nuova squadra</ToggleButton>
              </ToggleButtonGroup>
            )}
            {dialog === "opponent" && mode === "new" ? (
              <>
                <TextField
                  label="Nome"
                  size="small"
                  autoFocus
                  fullWidth
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <TextField
                  label="Città (facoltativa)"
                  size="small"
                  fullWidth
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
                <Divider />
                <Typography variant="caption" color="text.secondary">
                  La squadra entra nell&apos;anagrafica delle avversarie e subito in questo girone.
                </Typography>
              </>
            ) : (
              <FormControl size="small" fullWidth>
                <InputLabel>Squadra</InputLabel>
                <Select
                  label="Squadra"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value as string)}
                >
                  {dialog === "ours"
                    ? ourTeamsCatalog
                        .filter((t) => !ourIds.has(t.id))
                        .map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.name} · {t.season}
                          </MenuItem>
                        ))
                    : allOpponents
                        .filter((o) => !groupOppIds.has(o.id))
                        .map((o) => (
                          <MenuItem key={o.id} value={o.id}>
                            {o.name}
                            {o.city ? ` (${o.city})` : ""}
                          </MenuItem>
                        ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(null)} disabled={saving}>
            Annulla
          </Button>
          <Button variant="contained" onClick={submit} disabled={!canSubmit}>
            Aggiungi
          </Button>
        </DialogActions>
      </ResponsiveDialog>
      {ConfirmDialog}
    </Paper>
  );
}
