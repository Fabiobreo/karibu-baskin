"use client";
import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import type { ChildData, ChildFormState } from "@/components/profile/childLinkerShared";

interface ChildEditDialogProps {
  child: ChildData;
  onClose: () => void;
  /** Riceve il figlio aggiornato restituito dall'API. */
  onSaved: (updated: ChildData) => void;
}

/** Dialog di modifica dati figlio (nome, genere, data di nascita). */
export default function ChildEditDialog({ child, onClose, onSaved }: ChildEditDialogProps) {
  const t = useTranslations("childLinker");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();

  const [form, setForm] = useState<ChildFormState>({
    name: child.name,
    gender: child.gender ?? "",
    birthDate: child.birthDate ? new Date(child.birthDate).toISOString().slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          gender: form.gender || null,
          birthDate: form.birthDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ message: data.error ?? tCommon("saveError"), severity: "error" });
        return;
      }
      showToast({ message: t("childUpdated", { name: data.name }), severity: "success" });
      onSaved(data);
      onClose();
    } catch {
      showToast({ message: tCommon("networkError"), severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("editChild", { name: child.name })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label={t("fullNameReq")}
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            fullWidth
            size="small"
            inputProps={{ maxLength: 60 }}
          />
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              display="block"
              gutterBottom
            >
              {t("gender")}
            </Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={form.gender}
              onChange={(e) => setForm((s) => ({ ...s, gender: e.target.value }))}
            >
              <MenuItem value="">
                <em>{t("notSpecified")}</em>
              </MenuItem>
              <MenuItem value="MALE">{t("male")}</MenuItem>
              <MenuItem value="FEMALE">{t("female")}</MenuItem>
            </Select>
          </Box>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              display="block"
              gutterBottom
            >
              {t("birthDate")}
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm((s) => ({ ...s, birthDate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          {tCommon("cancel")}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? tCommon("saving") : t("saveChanges")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
