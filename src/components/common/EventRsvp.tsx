"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  Divider,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CancelIcon from "@mui/icons-material/Cancel";
import { useMutation } from "@tanstack/react-query";
import InlineError from "@/components/common/InlineError";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { readError } from "@/lib/fetchJson";
import { formatRome } from "@/lib/dateUtils";

type Status = "GOING" | "MAYBE" | "NOT_GOING";

export interface EventOptionView {
  id: string;
  label: string;
  startsAt: string | null;
  kind: string;
}

export interface EventRsvpSubject {
  /** null = l'utente stesso; altrimenti l'id del figlio. */
  childId: string | null;
  name: string;
  status?: Status;
  selectedOptionIds?: string[];
  note?: string | null;
}

interface EventRsvpProps {
  eventId: string;
  isLoggedIn: boolean;
  isPast: boolean;
  subjects: EventRsvpSubject[];
  options: EventOptionView[];
  initialCounts: { GOING: number; MAYBE: number; NOT_GOING: number };
}

const STATUS_OPTIONS: {
  value: Status;
  icon: React.ReactNode;
  color: "success" | "warning" | "error";
}[] = [
  { value: "GOING", icon: <CheckCircleIcon fontSize="small" />, color: "success" },
  { value: "MAYBE", icon: <HelpOutlineIcon fontSize="small" />, color: "warning" },
  { value: "NOT_GOING", icon: <CancelIcon fontSize="small" />, color: "error" },
];

// Ci sarò / Forse / Non ci sarò: gli stessi bottoni con e senza opzioni.
function StatusButtons({
  value,
  disabled,
  onSelect,
}: {
  value: Status | undefined;
  disabled: boolean;
  onSelect: (status: Status) => void;
}) {
  const t = useTranslations("events");
  const label = (s: Status) =>
    s === "GOING" ? t("going") : s === "MAYBE" ? t("maybe") : t("notGoing");
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {STATUS_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <Button
            key={opt.value}
            size="small"
            variant={selected ? "contained" : "outlined"}
            color={selected ? opt.color : "inherit"}
            startIcon={opt.icon}
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onSelect(opt.value)}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none" }}
          >
            {label(opt.value)}
          </Button>
        );
      })}
    </Box>
  );
}

// ── Modalità "opzioni": presenza all'evento + extra + note, un solo salvataggio ──
// Presenza e opzioni sono indipendenti: si può venire all'evento senza il
// pranzo, o solo al pranzo senza l'evento.
function SubjectOptionsForm({
  eventId,
  subject,
  options,
  onStatusSaved,
}: {
  eventId: string;
  subject: EventRsvpSubject;
  options: EventOptionView[];
  onStatusSaved: (prev: Status | undefined, next: Status) => void;
}) {
  const t = useTranslations("events");
  const { showToast } = useToast();
  const dl = useActiveDateLocale();
  const [status, setStatus] = useState<Status | undefined>(subject.status);
  const [savedStatus, setSavedStatus] = useState<Status | undefined>(subject.status);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(subject.selectedOptionIds ?? [])
  );
  const [note, setNote] = useState(subject.note ?? "");

  const mutation = useMutation({
    mutationFn: async (next: Status) => {
      const res = await fetch(`/api/events/${eventId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next,
          optionIds: [...selected],
          childId: subject.childId ?? undefined,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return next;
    },
    onSuccess: (next) => {
      onStatusSaved(savedStatus, next);
      setSavedStatus(next);
      showToast({ message: t("saved"), severity: "success" });
    },
    // L'errore resta sotto "Salva" di questo partecipante (UX-25).
  });

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
        {subject.childId ? subject.name : t("me")}
      </Typography>
      <StatusButtons value={status} disabled={mutation.isPending} onSelect={setStatus} />

      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        sx={{ display: "block", mt: 2 }}
      >
        {t("optionsHint")}
      </Typography>
      <FormGroup>
        {options.map((o) => (
          <FormControlLabel
            key={o.id}
            control={
              <Checkbox
                checked={selected.has(o.id)}
                onChange={() => toggle(o.id)}
                disabled={mutation.isPending}
              />
            }
            label={
              <Box component="span">
                {o.label}
                {o.startsAt && (
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    {formatRome(o.startsAt, "EEE d MMM, HH:mm", { locale: dl })}
                  </Typography>
                )}
              </Box>
            }
          />
        ))}
      </FormGroup>
      <TextField
        fullWidth
        size="small"
        multiline
        minRows={1}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("notePlaceholder")}
        sx={{ mt: 1 }}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1.5, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          size="small"
          disabled={mutation.isPending || !status}
          onClick={() => status && mutation.mutate(status)}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        >
          {t("save")}
        </Button>
        {/* Senza uno stato non si salva: "solo pranzo" e' "Non ci saro'" + Pranzo. */}
        {!status && (
          <Typography variant="caption" color="text.secondary">
            {t("chooseStatusFirst")}
          </Typography>
        )}
      </Box>
      {mutation.isError && (
        <InlineError
          title={t("rsvpNotSaved")}
          message={mutation.error instanceof Error ? mutation.error.message : t("saveError")}
          onRetry={() => status && mutation.mutate(status)}
          onClose={() => mutation.reset()}
          retrying={mutation.isPending}
        />
      )}
    </Box>
  );
}

export default function EventRsvp({
  eventId,
  isLoggedIn,
  isPast,
  subjects,
  options,
  initialCounts,
}: EventRsvpProps) {
  const t = useTranslations("events");
  const { showToast } = useToast();
  const hasOptions = options.length > 0;
  const [statuses, setStatuses] = useState<Record<string, Status | undefined>>(() =>
    Object.fromEntries(subjects.map((s) => [s.childId ?? "self", s.status]))
  );
  const [goingCount, setGoingCount] = useState(initialCounts.GOING);

  const statusMutation = useMutation({
    mutationFn: async (vars: { childId: string | null; status: Status }) => {
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: vars.status, childId: vars.childId ?? undefined }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return vars;
    },
    onSuccess: ({ childId, status }) => {
      const key = childId ?? "self";
      const prev = statuses[key];
      setStatuses((s) => ({ ...s, [key]: status }));
      setGoingCount((c) => c + (status === "GOING" ? 1 : 0) - (prev === "GOING" ? 1 : 0));
      showToast({ message: t("saved"), severity: "success" });
    },
    // L'errore resta sotto i bottoni della persona a cui si riferisce (UX-25).
    onError: (err, vars) =>
      setFailure({ vars, message: err instanceof Error ? err.message : t("saveError") }),
    onMutate: () => setFailure(null),
  });
  const [failure, setFailure] = useState<{
    vars: { childId: string | null; status: Status };
    message: string;
  } | null>(null);

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 1,
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight={800}>
          {t("rsvpTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("goingCount", { count: goingCount })}
        </Typography>
      </Box>

      {!isLoggedIn ? (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("rsvpLoginPrompt")}
          </Typography>
          <Button href="/login" variant="contained" sx={{ fontWeight: 700, borderRadius: 2 }}>
            {t("rsvpLoginCta")}
          </Button>
        </Box>
      ) : isPast ? (
        <Typography variant="body2" color="text.secondary">
          {t("rsvpClosed")}
        </Typography>
      ) : hasOptions ? (
        <Stack spacing={2.5} divider={<Divider flexItem />}>
          {subjects.map((subj) => (
            <SubjectOptionsForm
              key={subj.childId ?? "self"}
              eventId={eventId}
              subject={subj}
              options={options}
              onStatusSaved={(prev, next) =>
                setGoingCount((c) => c + (next === "GOING" ? 1 : 0) - (prev === "GOING" ? 1 : 0))
              }
            />
          ))}
        </Stack>
      ) : (
        <Stack spacing={2}>
          {subjects.map((subj) => {
            const key = subj.childId ?? "self";
            const current = statuses[key];
            return (
              <Box key={key}>
                {subjects.length > 1 && (
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.5 }}
                  >
                    {subj.childId ? subj.name : t("me")}
                  </Typography>
                )}
                <StatusButtons
                  value={current}
                  disabled={statusMutation.isPending}
                  onSelect={(status) => statusMutation.mutate({ childId: subj.childId, status })}
                />
                {failure && (failure.vars.childId ?? "self") === key && (
                  <InlineError
                    title={t("rsvpNotSaved")}
                    message={failure.message}
                    onRetry={() => statusMutation.mutate(failure.vars)}
                    onClose={() => setFailure(null)}
                    retrying={statusMutation.isPending}
                  />
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
