"use client";

import { useState } from "react";
import { Box, Typography, Button, Paper, Stack } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CancelIcon from "@mui/icons-material/Cancel";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";

type Status = "GOING" | "MAYBE" | "NOT_GOING";

export interface EventRsvpSubject {
  /** null = l'utente stesso; altrimenti l'id del figlio. */
  childId: string | null;
  name: string;
  status?: Status;
}

interface EventRsvpProps {
  eventId: string;
  isLoggedIn: boolean;
  isPast: boolean;
  subjects: EventRsvpSubject[];
  initialCounts: { GOING: number; MAYBE: number; NOT_GOING: number };
}

const OPTIONS: { value: Status; icon: React.ReactNode; color: "success" | "warning" | "error" }[] =
  [
    { value: "GOING", icon: <CheckCircleIcon fontSize="small" />, color: "success" },
    { value: "MAYBE", icon: <HelpOutlineIcon fontSize="small" />, color: "warning" },
    { value: "NOT_GOING", icon: <CancelIcon fontSize="small" />, color: "error" },
  ];

export default function EventRsvp({
  eventId,
  isLoggedIn,
  isPast,
  subjects,
  initialCounts,
}: EventRsvpProps) {
  const t = useTranslations("events");
  const { showToast } = useToast();
  const [statuses, setStatuses] = useState<Record<string, Status | undefined>>(() =>
    Object.fromEntries(subjects.map((s) => [s.childId ?? "self", s.status]))
  );
  const [goingCount, setGoingCount] = useState(initialCounts.GOING);

  const mutation = useMutation({
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
      // Aggiorna il contatore "ci sarò" per le risposte proprie.
      setGoingCount((c) => c + (status === "GOING" ? 1 : 0) - (prev === "GOING" ? 1 : 0));
      showToast({ message: t("saved"), severity: "success" });
    },
    onError: (err) => {
      showToast({
        message: err instanceof Error ? err.message : t("saveError"),
        severity: "error",
      });
    },
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
                  {OPTIONS.map((opt) => {
                    const selected = current === opt.value;
                    return (
                      <Button
                        key={opt.value}
                        size="small"
                        variant={selected ? "contained" : "outlined"}
                        color={selected ? opt.color : "inherit"}
                        startIcon={opt.icon}
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({ childId: subj.childId, status: opt.value })
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
