"use client";
import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { isoToLocalInput } from "@/lib/datetimeLocal";
import { drivePhotoUrl } from "@/lib/gallery/drive";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";
import type { AlbumCard } from "@/lib/gallery/albums";

/** Un evento o una partita a cui collegare l'album. */
export interface AlbumLinkOption {
  kind: "event" | "match";
  id: string;
  label: string;
}

interface AlbumFormDialogProps {
  open: boolean;
  /** Album da modificare; null = nuovo album. */
  album: AlbumCard | null;
  linkOptions: AlbumLinkOption[];
  driveConfigured: boolean;
  onClose: () => void;
  onSaved: (album: AlbumCard, created: boolean) => void;
}

interface FolderPreview {
  title: string;
  date: string;
  photoCount: number;
  otherFiles: number;
  truncated: boolean;
  sampleFileIds: string[];
}

type Visibility = AlbumCard["visibility"];

const VISIBILITY_OPTIONS: { value: Visibility; label: string; hint: string }[] = [
  {
    value: "MEMBERS",
    label: "Solo tesserati",
    hint: "Lo vede chi ha fatto l'accesso ed è atleta, genitore o staff. I motori di ricerca no.",
  },
  {
    value: "PUBLIC",
    label: "Pubblico",
    hint: "Lo vede chiunque apra il sito, anche senza account.",
  },
];

const LINK_GROUP: Record<AlbumLinkOption["kind"], string> = {
  event: "Eventi",
  match: "Partite",
};

/** Giorno (YYYY-MM-DD) di un istante, per `<input type="date">`. */
const toDateInput = (iso: string) => isoToLocalInput(iso).slice(0, 10);
/** Mezzogiorno di quel giorno: il fuso non lo sposta al giorno prima o dopo. */
const fromDateInput = (day: string) => new Date(`${day}T12:00:00`).toISOString();

/**
 * Nuovo album da una cartella Drive, o modifica di uno esistente (UX-52).
 * Nuovo: prima si legge la cartella dal link, poi si compila il resto. Chi lo
 * usa lo rimonta a ogni apertura (`key`), quindi lo stato parte dalle props.
 */
export default function AlbumFormDialog({
  open,
  album,
  linkOptions,
  driveConfigured,
  onClose,
  onSaved,
}: AlbumFormDialogProps) {
  const editing = !!album;
  const { showToast } = useToast();

  const [link, setLink] = useState("");
  const [preview, setPreview] = useState<FolderPreview | null>(null);
  const [title, setTitle] = useState(album?.title ?? "");
  const [day, setDay] = useState(album ? toDateInput(album.date) : "");
  const [visibility, setVisibility] = useState<Visibility>(album?.visibility ?? "MEMBERS");
  const [linked, setLinked] = useState<AlbumLinkOption | null>(
    () =>
      linkOptions.find(
        (o) =>
          (o.kind === "event" && o.id === album?.eventId) ||
          (o.kind === "match" && o.id === album?.matchId)
      ) ?? null
  );
  const [permission, setPermission] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showFields = editing || !!preview;

  async function readFolder() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/albums/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data: FolderPreview = await res.json();
      setPreview(data);
      setTitle(data.title);
      setDay(toDateInput(data.date));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Non sono riuscito a leggere la cartella");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!title.trim()) return setError("Scrivi un titolo");
    if (!day) return setError("Scegli la data");
    if (!editing && !permission) {
      return setError("Serve il permesso di chi ha scattato le foto");
    }
    setBusy(true);
    setError(null);
    const common = {
      title: title.trim(),
      date: fromDateInput(day),
      visibility,
      eventId: linked?.kind === "event" ? linked.id : null,
      matchId: linked?.kind === "match" ? linked.id : null,
    };
    try {
      const res = editing
        ? await fetch(`/api/albums/${album.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(common),
          })
        : await fetch("/api/albums", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...common, link, permissionDeclared: true }),
          });
      if (!res.ok) throw new Error(await readError(res));
      const saved: AlbumCard = await res.json();
      showToast({
        message: editing ? "Album aggiornato" : `Album creato: ${saved.photoCount} foto`,
        severity: "success",
      });
      onSaved(saved, !editing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvataggio non riuscito");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResponsiveDialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={FONT_WEIGHT.semibold}>
        {editing ? "Modifica album" : "Nuovo album"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
          {!editing && !driveConfigured && (
            <Alert severity="warning">
              Google Drive non è configurato: manca la variabile d&apos;ambiente{" "}
              <code>GOOGLE_DRIVE_API_KEY</code>.
            </Alert>
          )}

          {!editing && (
            <Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
                <TextField
                  label="Link della cartella Google Drive"
                  value={link}
                  onChange={(e) => {
                    setLink(e.target.value);
                    // Un altro link: quello che si era letto non vale più.
                    setPreview(null);
                  }}
                  placeholder="https://drive.google.com/drive/folders/…"
                  autoFocus
                  fullWidth
                  sx={{ flex: "1 1 260px" }}
                />
                <Button
                  variant={preview ? "outlined" : "contained"}
                  onClick={readFolder}
                  disabled={busy || !link.trim() || !driveConfigured}
                  startIcon={
                    busy && !preview ? <CircularProgress size={16} color="inherit" /> : null
                  }
                  sx={{ minHeight: 56, whiteSpace: "nowrap" }}
                >
                  Leggi cartella
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                La cartella dev&apos;essere condivisa con “Chiunque abbia il link”. Le foto restano
                su Drive: il sito non le copia.
              </Typography>
            </Box>
          )}

          {preview && (
            <Box>
              <Box sx={{ display: "flex", gap: 0.75, mb: 1 }}>
                {preview.sampleFileIds.map((fileId) => (
                  <Box
                    key={fileId}
                    component="img"
                    src={drivePhotoUrl(fileId, 200)}
                    alt=""
                    referrerPolicy="no-referrer"
                    sx={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: RADIUS.md,
                      bgcolor: "action.hover",
                    }}
                  />
                ))}
              </Box>
              <Typography variant="body2">
                {preview.photoCount} foto
                {preview.otherFiles > 0 &&
                  `, più ${preview.otherFiles} altri file (video o sottocartelle) che non verranno mostrati`}
                .
              </Typography>
              {preview.truncated && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  La cartella ha più di {preview.photoCount} foto: sul sito ci saranno le prime{" "}
                  {preview.photoCount}.
                </Alert>
              )}
            </Box>
          )}

          {showFields && (
            <>
              <TextField
                label="Titolo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                inputProps={{ maxLength: 120 }}
                fullWidth
              />
              <TextField
                label="Data"
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <Autocomplete
                options={linkOptions}
                value={linked}
                onChange={(_, value) => setLinked(value)}
                groupBy={(option) => LINK_GROUP[option.kind]}
                getOptionLabel={(option) => option.label}
                getOptionKey={(option) => `${option.kind}-${option.id}`}
                isOptionEqualToValue={(a, b) => a.kind === b.kind && a.id === b.id}
                noOptionsText="Nessun evento o partita"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Collega a un evento o a una partita (facoltativo)"
                  />
                )}
              />

              <FormControl>
                <FormLabel id="album-visibility" sx={{ mb: 0.5 }}>
                  Chi lo vede
                </FormLabel>
                <RadioGroup
                  aria-labelledby="album-visibility"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Visibility)}
                >
                  {VISIBILITY_OPTIONS.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      value={option.value}
                      control={<Radio />}
                      sx={{ alignItems: "flex-start", py: 0.5 }}
                      label={
                        <Box sx={{ pt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: FONT_WEIGHT.semibold }}>
                            {option.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.hint}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  La cartella Drive resta aperta a chiunque abbia il link. “Solo tesserati” vuol
                  dire che il sito non la mostra e non la fa trovare ad altri.
                </Typography>
              </FormControl>

              {visibility === "PUBLIC" && (
                <Alert severity="warning">
                  Le foto saranno visibili a chiunque e ai motori di ricerca. Controlla che non ci
                  siano minori senza liberatoria.
                </Alert>
              )}

              {!editing && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={permission}
                      onChange={(e) => setPermission(e.target.checked)}
                    />
                  }
                  label="Ho il permesso di chi ha scattato le foto di mostrarle sul sito"
                />
              )}
            </>
          )}

          {error && (
            <Alert severity="error" role="alert">
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Annulla
        </Button>
        {showFields && (
          <Button
            variant="contained"
            onClick={save}
            disabled={busy || (!editing && !permission)}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {editing ? "Salva" : "Crea album"}
          </Button>
        )}
      </DialogActions>
    </ResponsiveDialog>
  );
}
