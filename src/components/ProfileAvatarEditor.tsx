"use client";

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import ImageUploader from "@/components/ImageUploader";
import { useToast } from "@/context/ToastContext";

interface ProfileAvatarEditorProps {
  googleImage: string | null;
  customImage: string | null;
}

export default function ProfileAvatarEditor({
  googleImage,
  customImage: initialCustomImage,
}: ProfileAvatarEditorProps) {
  const [customImage, setCustomImage] = useState<string | null>(initialCustomImage);
  const { showToast } = useToast();

  const displayImage = customImage ?? googleImage;

  async function handleUploaded(url: string) {
    const res = await fetch("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customImage: url }),
    });
    if (!res.ok) {
      showToast({ message: "Errore nel salvataggio dell'immagine", severity: "error" });
      return;
    }
    setCustomImage(url);
  }

  async function handleRemoved() {
    const res = await fetch("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customImage: null }),
    });
    if (!res.ok) {
      showToast({ message: "Errore nella rimozione dell'immagine", severity: "error" });
      return;
    }
    setCustomImage(null);
    showToast({ message: "Immagine rimossa", severity: "success" });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <ImageUploader
        currentUrl={displayImage}
        folder="avatars"
        onUploaded={handleUploaded}
        onRemoved={customImage ? handleRemoved : undefined}
        shape="circle"
        size={80}
      />
      {!customImage && googleImage && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
          Foto da Google
        </Typography>
      )}
    </Box>
  );
}
