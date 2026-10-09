"use client";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { drivePhotoUrl } from "@/lib/gallery/drive";
import { pickCover } from "@/lib/gallery/albumRules";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import type { AlbumCard } from "@/lib/gallery/albums";

interface AlbumPhotosDialogProps {
  album: AlbumCard;
  onClose: () => void;
  /** Foto visibili e copertina sono cambiate: la riga dell'album va aggiornata. */
  onChanged: (patch: Pick<AlbumCard, "photoCount" | "coverFileId">) => void;
}

interface AdminPhoto {
  id: string;
  driveFileId: string;
  name: string;
  hidden: boolean;
}

interface AlbumPhotosData {
  coverPhotoId: string | null;
  photos: AdminPhoto[];
}

/**
 * Moderazione delle foto di un album (UX-52): nascondere una foto (resta
 * nascosta anche dopo "Aggiorna") e scegliere la copertina.
 */
export default function AlbumPhotosDialog({ album, onClose, onChanged }: AlbumPhotosDialogProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const queryKey = ["album-photos", album.id];

  const { data, isPending, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<AlbumPhotosData> => {
      const res = await fetch(`/api/albums/${album.id}/photos`);
      if (!res.ok) throw new Error(await readError(res));
      return res.json();
    },
  });

  /** Aggiorna la cache e dice alla riga dell'album cosa è cambiato. */
  function apply(next: AlbumPhotosData) {
    queryClient.setQueryData(queryKey, next);
    onChanged({
      photoCount: next.photos.filter((p) => !p.hidden).length,
      coverFileId: pickCover(next.photos, next.coverPhotoId)?.driveFileId ?? null,
    });
  }

  async function toggleHidden(photo: AdminPhoto) {
    if (!data) return;
    const hidden = !photo.hidden;
    setBusyId(photo.id);
    try {
      const res = await fetch(`/api/albums/${album.id}/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden }),
      });
      if (!res.ok) throw new Error(await readError(res));
      apply({
        // Una copertina nascosta non resta copertina (lo fa anche il server).
        coverPhotoId: hidden && data.coverPhotoId === photo.id ? null : data.coverPhotoId,
        photos: data.photos.map((p) => (p.id === photo.id ? { ...p, hidden } : p)),
      });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function setCover(photo: AdminPhoto) {
    if (!data) return;
    setBusyId(photo.id);
    try {
      const res = await fetch(`/api/albums/${album.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverPhotoId: photo.id }),
      });
      if (!res.ok) throw new Error(await readError(res));
      apply({ ...data, coverPhotoId: photo.id });
      showToast({ message: "Copertina aggiornata", severity: "success" });
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
    } finally {
      setBusyId(null);
    }
  }

  const cover = data ? pickCover(data.photos, data.coverPhotoId) : null;
  const hiddenCount = data?.photos.filter((p) => p.hidden).length ?? 0;

  return (
    <ResponsiveDialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={FONT_WEIGHT.semibold}>Foto: {album.title}</DialogTitle>
      <DialogContent>
        {isPending && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress aria-label="Carico le foto" />
          </Box>
        )}
        {error && <Alert severity="error">{error.message}</Alert>}
        {data && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {data.photos.length} foto, {hiddenCount} {hiddenCount === 1 ? "nascosta" : "nascoste"}
              . Una foto nascosta non compare sul sito e resta nascosta anche dopo “Aggiorna”. Su
              Drive non cambia niente.
            </Typography>
            <Box
              component="ul"
              sx={{
                listStyle: "none",
                m: 0,
                p: 0,
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  sm: "repeat(3, 1fr)",
                  md: "repeat(4, 1fr)",
                },
              }}
            >
              {data.photos.map((photo, index) => {
                const isCover = cover?.id === photo.id;
                const busy = busyId === photo.id;
                return (
                  <Box
                    component="li"
                    key={photo.id}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: RADIUS.md,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Box
                      component="img"
                      src={drivePhotoUrl(photo.driveFileId, 320)}
                      alt={`Foto ${index + 1}: ${photo.name}`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      sx={{
                        display: "block",
                        width: "100%",
                        aspectRatio: "4 / 3",
                        objectFit: "cover",
                        bgcolor: "action.hover",
                        opacity: photo.hidden ? 0.35 : 1,
                      }}
                    />
                    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                      {/* Lo stato è una parola, non solo l'opacità della foto. */}
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: FONT_WEIGHT.semibold, minHeight: "1.5em" }}
                      >
                        {photo.hidden ? "Nascosta" : isCover ? "Copertina" : ""}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy}
                        onClick={() => toggleHidden(photo)}
                        aria-label={`${photo.hidden ? "Mostra" : "Nascondi"} la foto ${index + 1}`}
                        sx={TOUCH_TARGET_ON_PHONE}
                      >
                        {photo.hidden ? "Mostra" : "Nascondi"}
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        disabled={busy || photo.hidden || isCover}
                        onClick={() => setCover(photo)}
                        aria-label={`Usa la foto ${index + 1} come copertina`}
                        sx={TOUCH_TARGET_ON_PHONE}
                      >
                        Usa come copertina
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
