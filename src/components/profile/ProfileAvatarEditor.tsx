"use client";

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import ImageUploader from "@/components/common/ImageUploader";
import { useToast } from "@/context/ToastContext";

import { errorText } from "@/lib/networkError";
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
  const tCommon = useTranslations("common");

  const displayImage = customImage ?? googleImage;

  /** Salva la foto sul profilo. `ImageUploader` non aspetta questi callback:
   * senza try un errore di rete restava un rifiuto non gestito (Sentry, /profilo). */
  async function saveImage(image: string | null): Promise<boolean> {
    const failure = image ? t("avatarSaveError") : t("avatarRemoveError");
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customImage: image }),
      });
      if (res.ok) return true;
      showToast({ message: failure, severity: "error" });
    } catch (err) {
      showToast({ message: errorText(err, failure, tCommon("networkError")), severity: "error" });
    }
    return false;
  }

  async function handleUploaded(url: string) {
    if (await saveImage(url)) setCustomImage(url);
  }

  async function handleRemoved() {
    if (!(await saveImage(null))) return;
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
