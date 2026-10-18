"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
import { alpha } from "@mui/material/styles";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import { useToast } from "@/context/ToastContext";
import type { BlobFolder } from "@/lib/blob";
import { readError } from "@/lib/fetchJson";

import { errorText } from "@/lib/networkError";
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
  // Tradotto: oltre al pannello staff lo usa il profilo pubblico (foto profilo).
  const t = useTranslations("imageUploader");
  const tCommon = useTranslations("common");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = "";
    if (!file) return;

    if (file.size > MAX_SIZE_BYTES) {
      showToast({ message: t("tooLarge"), severity: "error" });
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast({ message: t("badFormat"), severity: "error" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    setUploading(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      // L'upload e' il caso in cui questo conta di piu': un file troppo grande
      // torna 413 con una pagina HTML, non con un JSON.
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      onUploaded(data.url as string);
      showToast({ message: t("uploaded"), severity: "success" });
    } catch (err) {
      showToast({
        message: errorText(err, t("uploadError"), tCommon("networkError")),
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
              bgcolor: (theme) => alpha(theme.palette.common.black, 0.4),
              borderRadius,
            }}
          >
            <CircularProgress size={28} sx={{ color: "common.white" }} />
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
            <Tooltip title={t("change")}>
              <IconButton
                size="small"
                onClick={() => inputRef.current?.click()}
                sx={{
                  bgcolor: "primary.fill",
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
              <Tooltip title={t("remove")}>
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
        <DialogTitle>{t("remove")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("removeConfirm")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t("cancel")}</Button>
          <Button onClick={handleRemoveConfirm} color="error" variant="contained">
            {t("removeAction")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
