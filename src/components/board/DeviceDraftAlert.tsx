"use client";
import { Alert, Box, Button } from "@mui/material";
import { useTranslations } from "next-intl";

/** "Su questo dispositivo ci sono modifiche non ancora salvate" (UX-72, UX-73). */
export default function DeviceDraftAlert({
  onRestore,
  onDiscard,
}: {
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("board.editor");
  return (
    <Alert
      severity="info"
      sx={{ mb: 2 }}
      action={
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button color="inherit" onClick={onRestore}>
            {t("draftRestore")}
          </Button>
          <Button color="inherit" onClick={onDiscard}>
            {t("draftDiscard")}
          </Button>
        </Box>
      }
    >
      {t("draftFound")}
    </Alert>
  );
}
