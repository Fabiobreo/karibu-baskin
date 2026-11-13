"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import { useTranslations } from "next-intl";
import { MAX_SIDE_NAME } from "@/lib/games/sfida";
import { cleanSideName } from "@/lib/games/sfidaState";

interface SfidaNameDialogProps {
  open: boolean;
  initial: string;
  /** Un nome a caso dall'elenco (il dado). */
  randomName: () => string;
  onSave: (name: string) => void;
  onClose: () => void;
}

/** La matita del tabellone (UX-69): scrivi il nome della squadra o tira il dado. */
export default function SfidaNameDialog({
  open,
  initial,
  randomName,
  onSave,
  onClose,
}: SfidaNameDialogProps) {
  const t = useTranslations("simulator");
  const [name, setName] = useState(initial);
  const clean = cleanSideName(name);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (clean) onSave(clean);
        }}
      >
        <DialogTitle>{t("nameTitle")}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label={t("nameLabel")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: MAX_SIDE_NAME } }}
            />
            <IconButton
              onClick={() => setName(randomName())}
              aria-label={t("randomName")}
              sx={{ width: 48, height: 48, flex: "none" }}
            >
              <CasinoIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t("cancel")}</Button>
          <Button type="submit" variant="contained" disabled={!clean}>
            {t("save")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
