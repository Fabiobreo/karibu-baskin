"use client";

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
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
      {!customImage && googleImage && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
          {t("googlePhoto")}
        </Typography>
      )}
    </Box>
  );
}
