"use client";

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import ImageUploader from "@/components/common/ImageUploader";
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
  // La foto di Google può esserci a DB e non caricarsi (URL scaduto): sotto un
  // avatar vuoto la didascalia "Foto da Google" non ha senso (UX-42). La prova
  // la fa un'immagine a parte: l'`<img>` dell'avatar arriva dal server e il suo
  // errore può scattare prima dell'idratazione, quando nessuno ascolta.
  const [googleFailed, setGoogleFailed] = useState(false);
  useEffect(() => {
    if (!googleImage) return;
    const probe = new Image();
    probe.onerror = () => setGoogleFailed(true);
    probe.src = googleImage;
    return () => {
      probe.onerror = null;
    };
  }, [googleImage]);
  const { showToast } = useToast();
  const t = useTranslations("childLinker");

  const displayImage = customImage ?? googleImage;

  async function handleUploaded(url: string) {
    const res = await fetch("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customImage: url }),
    });
    if (!res.ok) {
      showToast({ message: t("avatarSaveError"), severity: "error" });
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
      showToast({ message: t("avatarRemoveError"), severity: "error" });
      return;
    }
    setCustomImage(null);
    showToast({ message: t("avatarRemoved"), severity: "success" });
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
      {!customImage && googleImage && !googleFailed && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
          {t("googlePhoto")}
        </Typography>
      )}
    </Box>
  );
}
