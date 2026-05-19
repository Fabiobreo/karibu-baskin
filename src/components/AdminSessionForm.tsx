"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SessionRestrictionEditor, {
  seasonForDate,
  type RestrictionValue,
} from "@/components/SessionRestrictionEditor";

// Schema del form client-side — include la validazione cross-field inizio/fine
const SessionFormSchema = z
  .object({
    title: z.string().min(1, "Il titolo è obbligatorio").max(200),
    date: z.string().min(1, "La data è obbligatoria"),
    time: z.string().min(1, "L'orario di inizio è obbligatorio"),
    endTime: z.string(),
  })
  .refine((d) => !d.time || !d.endTime || d.endTime > d.time, {
    message: "L'orario di fine deve essere dopo l'inizio",
    path: ["endTime"],
  });

type FormValues = z.infer<typeof SessionFormSchema>;

interface Props {
  onCreated: () => void;
  showTitle?: boolean;
  formId?: string;
  onLoadingChange?: (loading: boolean) => void;
}

const DEFAULT_RESTRICTIONS: RestrictionValue = {
  allowedRoles: [],
  restrictTeamId: null,
  openRoles: [],
};

export default function AdminSessionForm({
  onCreated,
  showTitle = true,
  formId,
  onLoadingChange,
}: Props) {
  const [restrictions, setRestrictions] = useState<RestrictionValue>(DEFAULT_RESTRICTIONS);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(SessionFormSchema),
    defaultValues: { title: "", date: "", time: "18:00", endTime: "20:00" },
  });

  const dateValue = watch("date");

  async function onSubmit(values: FormValues) {
    onLoadingChange?.(true);
    setApiError(null);
    try {
      const dateTime = new Date(`${values.date}T${values.time}:00`);
      const endDateTime = values.endTime ? new Date(`${values.date}T${values.endTime}:00`) : null;
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title.trim(),
          date: dateTime.toISOString(),
          endTime: endDateTime?.toISOString() ?? null,
          dateSlug: `${values.date}${values.time}`.replace(/-/g, "").replace(":", ""),
          allowedRoles: restrictions.allowedRoles,
          restrictTeamId: restrictions.restrictTeamId,
          openRoles: restrictions.openRoles,
        }),
      });

      if (res.status === 401) {
        setApiError("Sessione scaduta, effettua di nuovo il login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setApiError(data.error ?? "Errore nella creazione");
        return;
      }

      reset();
      setRestrictions(DEFAULT_RESTRICTIONS);
      onCreated();
    } catch {
      setApiError("Errore di rete, riprova");
    } finally {
      onLoadingChange?.(false);
    }
  }

  return (
    <Box component="form" id={formId} onSubmit={handleSubmit(onSubmit)}>
      {showTitle && (
        <Typography variant="h6" gutterBottom>
          Nuovo allenamento
        </Typography>
      )}

      <TextField
        label="Titolo"
        {...register("title")}
        fullWidth
        size="small"
        placeholder="es. Allenamento settimanale"
        sx={{ mb: 2 }}
        disabled={isSubmitting}
        error={!!errors.title}
        helperText={errors.title?.message}
      />

      <TextField
        label="Data"
        type="date"
        {...register("date")}
        size="small"
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { max: "2100-12-31", min: "2026-01-01" },
        }}
        disabled={isSubmitting}
        error={!!errors.date}
        helperText={errors.date?.message ?? " "}
        sx={{ mb: 1, width: "100%" }}
      />

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField
          label="Inizio"
          type="time"
          {...register("time")}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          disabled={isSubmitting}
          error={!!errors.time}
          helperText={errors.time?.message ?? " "}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Fine"
          type="time"
          {...register("endTime")}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          disabled={isSubmitting}
          error={!!errors.endTime}
          helperText={errors.endTime?.message ?? " "}
          sx={{ flex: 1 }}
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      <SessionRestrictionEditor
        value={restrictions}
        onChange={setRestrictions}
        disabled={isSubmitting}
        seasonFilter={dateValue ? seasonForDate(new Date(dateValue)) : undefined}
      />

      {apiError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {apiError}
        </Alert>
      )}

      {!formId && (
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          sx={{ mt: 2 }}
        >
          {isSubmitting ? "Creazione..." : "Crea allenamento"}
        </Button>
      )}
    </Box>
  );
}
