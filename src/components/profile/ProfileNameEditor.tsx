"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Box, Button, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";

interface ProfileNameEditorProps {
  name: string | null;
  /** false con un account Google collegato: il nome lo riscrive Google a ogni accesso. */
  editable: boolean;
}

/**
 * Nome nella card del profilo. Chi entra col magic link il nome l'ha scritto a
 * mano al primo accesso: qui può correggerlo. Per gli account Google resta in
 * sola lettura, perché la modifica sparirebbe al login successivo.
 */
export default function ProfileNameEditor({ name, editable }: ProfileNameEditorProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name ?? "");

  const save = useMutation({
    mutationFn: async (next: string) => {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) throw new Error(await readError(res));
    },
    onSuccess: () => {
      setEditing(false);
      showToast({ message: t("nameSaved"), severity: "success" });
      router.refresh();
    },
    onError: (err) =>
      showToast({
        message: err instanceof Error ? err.message : t("nameSaveError"),
        severity: "error",
      }),
  });

  if (editing) {
    const trimmed = value.trim();
    return (
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed.length >= 2) save.mutate(trimmed);
        }}
        sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap", mb: 0.5 }}
      >
        <TextField
          size="small"
          label={t("nameLabel")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="name"
          autoFocus
          slotProps={{ htmlInput: { maxLength: 60 } }}
          error={trimmed.length > 0 && trimmed.length < 2}
          sx={{ flex: "1 1 200px" }}
        />
        <Button type="submit" variant="contained" disabled={save.isPending || trimmed.length < 2}>
          {t("nameSave")}
        </Button>
        <Button
          onClick={() => {
            setValue(name ?? "");
            setEditing(false);
          }}
          disabled={save.isPending}
        >
          {t("nameCancel")}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
      <Typography variant="h6" fontWeight={700} noWrap>
        {name ?? "—"}
      </Typography>
      {editable && (
        <Tooltip title={t("nameEdit")}>
          <IconButton size="small" aria-label={t("nameEdit")} onClick={() => setEditing(true)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
