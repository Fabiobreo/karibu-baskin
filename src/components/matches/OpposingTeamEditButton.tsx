"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter } from "next/navigation";

export interface OpposingTeamEditButtonProps {
  teamId: string;
  initial: {
    name: string;
    city: string | null;
    address: string | null;
    website: string | null;
    colors: string | null;
    notes: string | null;
    imageUrl: string | null;
  };
}

export default function OpposingTeamEditButton({ teamId, initial }: OpposingTeamEditButtonProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(initial.name);
  const [city, setCity] = useState(initial.city ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [colors, setColors] = useState(initial.colors ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(initial.imageUrl);

  function reset() {
    setName(initial.name);
    setCity(initial.city ?? "");
    setAddress(initial.address ?? "");
    setWebsite(initial.website ?? "");
    setColors(initial.colors ?? "");
    setNotes(initial.notes ?? "");
    setImageUrl(initial.imageUrl);
    setError("");
  }

  function handleOpen() {
    reset();
    setOpen(true);
  }

  function handleClose() {
    if (loading || uploading) return;
    setOpen(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // consenti ri-selezione dello stesso file
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("folder", "opponents");
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Errore durante il caricamento dell'immagine");
        return;
      }
      setImageUrl(data.url);
    } catch {
      setError("Errore di rete durante il caricamento");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setError("");
    if (!name.trim()) {
      setError("Il nome non può essere vuoto");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/opposing-teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim() || null,
          address: address.trim() || null,
          website: website.trim() || null,
          colors: colors.trim() || null,
          notes: notes.trim() || null,
          imageUrl: imageUrl || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Errore nel salvataggio");
        setLoading(false);
        return;
      }
      setOpen(false);
      setLoading(false);
      router.refresh();
    } catch {
      setError("Errore di rete, riprova");
      setLoading(false);
    }
  }

  return (
    <>
      <Tooltip title="Modifica squadra">
        <IconButton
          onClick={handleOpen}
          size="small"
          aria-label="Modifica squadra avversaria"
          sx={{
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
          }}
        >
          <EditIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Modifica squadra avversaria</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* Immagine */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Foto / logo
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 88,
                    height: 88,
                    borderRadius: 2,
                    flexShrink: 0,
                    bgcolor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL Blob esterno, no next/image
                    <img
                      src={imageUrl}
                      alt="Anteprima"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <PhotoCameraIcon sx={{ color: "text.disabled" }} />
                  )}
                </Box>
                <Stack spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={
                      uploading ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <PhotoCameraIcon />
                      )
                    }
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || loading}
                  >
                    {imageUrl ? "Cambia immagine" : "Carica immagine"}
                  </Button>
                  {imageUrl && (
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setImageUrl(null)}
                      disabled={uploading || loading}
                    >
                      Rimuovi
                    </Button>
                  )}
                </Stack>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={handleFile}
                />
              </Box>
            </Box>

            <TextField
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              disabled={loading}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Città"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                sx={{ flex: 1 }}
                disabled={loading}
              />
              <TextField
                label="Colori"
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                sx={{ flex: 1 }}
                placeholder="es. Bianco-blu"
                disabled={loading}
              />
            </Box>
            <TextField
              label="Indirizzo / Palestra"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              fullWidth
              disabled={loading}
            />
            <TextField
              label="Sito web"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              fullWidth
              placeholder="https://…"
              disabled={loading}
            />
            <TextField
              label="Note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Punti di forza, giocatori chiave, da ricordare…"
              disabled={loading}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={loading || uploading} color="inherit">
            Annulla
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading || uploading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ px: 3 }}
          >
            {loading ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
