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
import Link from "next/link";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";

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

// ── Modalità "opzioni": checklist + note, con salvataggio per partecipante ──
function SubjectOptionsForm({
  eventId,
  subject,
  options,
  onCountDelta,
}: {
  eventId: string;
  subject: EventRsvpSubject;
  options: EventOptionView[];
  onCountDelta: (delta: number) => void;
}) {
  const t = useTranslations("events");
  const { showToast } = useToast();
  const dl = useActiveDateLocale();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(subject.selectedOptionIds ?? [])
  );
  const [note, setNote] = useState(subject.note ?? "");
  const [savedGoing, setSavedGoing] = useState((subject.selectedOptionIds?.length ?? 0) > 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${eventId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionIds: [...selected],
          childId: subject.childId ?? undefined,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? t("saveError"));
    },
    onSuccess: () => {
      const nowGoing = selected.size > 0;
      if (nowGoing !== savedGoing) {
        onCountDelta(nowGoing ? 1 : -1);
        setSavedGoing(nowGoing);
      }
      showToast({ message: t("saved"), severity: "success" });
    },
    onError: (err) =>
      showToast({
        message: err instanceof Error ? err.message : t("saveError"),
        severity: "error",
      }),
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
                    color="text.disabled"
                    sx={{ ml: 1 }}
                  >
                    {format(new Date(o.startsAt), "EEE d MMM, HH:mm", { locale: dl })}
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
      <Button
        variant="contained"
        size="small"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        sx={{ mt: 1.5, fontWeight: 700, borderRadius: 2 }}
      >
        {t("save")}
      </Button>
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
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? t("saveError"));
      return vars;
    },
    onSuccess: ({ childId, status }) => {
      const key = childId ?? "self";
      const prev = statuses[key];
      setStatuses((s) => ({ ...s, [key]: status }));
      setGoingCount((c) => c + (status === "GOING" ? 1 : 0) - (prev === "GOING" ? 1 : 0));
      showToast({ message: t("saved"), severity: "success" });
    },
    onError: (err) =>
      showToast({
        message: err instanceof Error ? err.message : t("saveError"),
        severity: "error",
      }),
  });

  const label = (s: Status) =>
    s === "GOING" ? t("going") : s === "MAYBE" ? t("maybe") : t("notGoing");

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
          <Link href="/login" style={{ textDecoration: "none" }}>
            <Button variant="contained" sx={{ fontWeight: 700, borderRadius: 2 }}>
              {t("rsvpTitle")}
            </Button>
          </Link>
        </Box>
      ) : isPast ? (
        <Typography variant="body2" color="text.disabled">
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
              onCountDelta={(d) => setGoingCount((c) => c + d)}
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
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {STATUS_OPTIONS.map((opt) => {
                    const selected = current === opt.value;
                    return (
                      <Button
                        key={opt.value}
                        size="small"
                        variant={selected ? "contained" : "outlined"}
                        color={selected ? opt.color : "inherit"}
                        startIcon={opt.icon}
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({ childId: subj.childId, status: opt.value })
                        }
                        sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none" }}
                      >
                        {label(opt.value)}
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
