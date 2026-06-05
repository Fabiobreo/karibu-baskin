"use client";

import { useRef, useState } from "react";
import {
  Box,
  Avatar,
  IconButton,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import { useToast } from "@/context/ToastContext";
import type { BlobFolder } from "@/lib/blob";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

interface ImageUploaderProps {
  currentUrl: string | null | undefined;
  folder: BlobFolder;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
  shape?: "circle" | "square";
  size?: number; // px, default 120
  disabled?: boolean;
}

export default function ImageUploader({
  currentUrl,
  folder,
  onUploaded,
  onRemoved,
  shape = "square",
  size = 120,
  disabled = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { showToast } = useToast();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = "";
    if (!file) return;

    if (file.size > MAX_SIZE_BYTES) {
      showToast({ message: "Il file supera il limite di 5 MB", severity: "error" });
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast({ message: "Formato non supportato. Usa JPEG, PNG o WebP", severity: "error" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    setUploading(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore durante l'upload");
      onUploaded(data.url as string);
      showToast({ message: "Immagine caricata", severity: "success" });
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Errore durante l'upload",
        severity: "error",
      });
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveConfirm() {
    setConfirmOpen(false);
    onRemoved?.();
  }

  const borderRadius = shape === "circle" ? "50%" : "8px";

  return (
    <>
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <Avatar
          src={currentUrl ?? undefined}
          variant="square"
          sx={{
            width: size,
            height: size,
            borderRadius,
            bgcolor: "grey.200",
            border: "2px solid",
            borderColor: "divider",
          }}
        />

        {uploading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0,0,0,0.4)",
              borderRadius,
            }}
          >
            <CircularProgress size={28} sx={{ color: "white" }} />
          </Box>
        )}

        {!disabled && !uploading && (
          <Box
            sx={{
              position: "absolute",
              bottom: -6,
              right: -6,
              display: "flex",
              gap: 0.5,
            }}
          >
            <Tooltip title="Cambia immagine">
              <IconButton
                size="small"
                onClick={() => inputRef.current?.click()}
                sx={{
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": { bgcolor: "primary.dark" },
                  width: 28,
                  height: 28,
                }}
              >
                <CameraAltIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>

            {currentUrl && onRemoved && (
              <Tooltip title="Rimuovi immagine">
                <IconButton
                  size="small"
                  onClick={() => setConfirmOpen(true)}
                  sx={{
                    bgcolor: "error.main",
                    color: "white",
                    "&:hover": { bgcolor: "error.dark" },
                    width: 28,
                    height: 28,
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          hidden
          onChange={handleFileChange}
        />
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>Rimuovi immagine</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sei sicuro di voler rimuovere questa immagine? L&apos;operazione non può essere
            annullata.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Annulla</Button>
          <Button onClick={handleRemoveConfirm} color="error" variant="contained">
            Rimuovi
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
