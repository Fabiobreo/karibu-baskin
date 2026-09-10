"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";

/** Un iscrivibile: l'utente stesso oppure un figlio collegato. */
export interface TrainingSubject {
  kind: "user" | "child";
  /** id dell'utente o del figlio. */
  id: string;
  name: string;
  /** Ruolo Baskin, necessario per iscriversi. Null = questionario da fare. */
  sportRole: number | null;
  /** Id dell'iscrizione esistente, se già iscritto. */
  registrationId: string | null;
  /** False se le restrizioni della sessione lo escludono. */
  allowed: boolean;
  /** Motivo dell'esclusione, dal controllo restrizioni condiviso. */
  reason?: string | null;
}

export interface NextTrainingInfo {
  id: string;
  title: string;
  /** ISO. */
  date: string;
  /** Slug leggibile per l'URL pubblico; ricade sull'id. */
  href: string;
  registrationOpen: boolean;
  teamName: string | null;
}

interface NextTrainingCardProps {
  training: NextTrainingInfo;
  subjects: TrainingSubject[];
}

/**
 * Card "Prossimo allenamento" in cima al profilo.
 *
 * È il motivo principale per cui un atleta apre il sito, e prima non c'era: il
 * profilo mostrava solo anagrafica e traguardi. Per un genitore le righe sono
 * quelle dei figli collegati, con la stessa azione.
 */
export default function NextTrainingCard({ training, subjects }: NextTrainingCardProps) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const dateLocale = useActiveDateLocale();
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Stato locale sovrapposto alle props: `router.refresh()` rigenera il Server
  // Component ma non reinizializza lo stato React, quindi la riga deve
  // aggiornarsi da sé (vedi CLAUDE.md).
  const [overrides, setOverrides] = useState<Map<string, string | null>>(new Map());

  function registrationIdOf(s: TrainingSubject): string | null {
    return overrides.has(s.id) ? overrides.get(s.id)! : s.registrationId;
  }

  async function handleRegister(subject: TrainingSubject) {
    setBusyId(subject.id);
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: training.id,
          role: subject.sportRole,
          name: subject.name,
          ...(subject.kind === "child" ? { childId: subject.id } : {}),
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      setOverrides((m) => new Map(m).set(subject.id, data.id ?? "pending"));
      showToast({ message: t("registerDone"), severity: "success" });
      router.refresh();
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : tCommon("error"),
        severity: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnregister(subject: TrainingSubject, regId: string) {
    setBusyId(subject.id);
    try {
      const res = await fetch(`/api/registrations/${regId}`, { method: "DELETE" });
      if (!res.ok) {
        const message = await readError(res);
        throw new Error(message);
      }
      setOverrides((m) => new Map(m).set(subject.id, null));
      showToast({ message: t("unregisterDone"), severity: "success" });
      router.refresh();
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : tCommon("error"),
        severity: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  const date = new Date(training.date);

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3, borderColor: "primary.main" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <CalendarMonthIcon sx={{ fontSize: 20, color: "primary.main" }} />
        <Typography
          variant="overline"
          fontWeight={800}
          color="primary.onLight"
          sx={{ letterSpacing: "0.08em" }}
        >
          {t("nextTraining")}
        </Typography>
      </Box>

      <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.25 }}>
        {training.title}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {format(date, "EEEE d MMMM · HH:mm", { locale: dateLocale })}
        </Typography>
        {training.teamName && (
          <Chip label={training.teamName} size="small" sx={{ fontWeight: 700 }} />
        )}
      </Box>

      {!training.registrationOpen && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          <strong>{t("registrationsClosed")}</strong> {t("registrationsClosedDesc")}
        </Typography>
      )}

      <Divider sx={{ my: 2 }} />

      <Stack spacing={1.5}>
        {subjects.map((s) => {
          const regId = registrationIdOf(s);
          const isRegistered = regId !== null;
          const busy = busyId === s.id;
          const canActNow = training.registrationOpen && s.allowed;
          const needsRole = s.sportRole == null;
          return (
            <Box
              key={`${s.kind}-${s.id}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                {isRegistered ? (
                  <CheckCircleIcon sx={{ fontSize: 18, color: "match.win" }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                )}
                <Typography variant="body2" fontWeight={600} noWrap>
                  {s.kind === "child"
                    ? isRegistered
                      ? t("childRegistered", { name: s.name })
                      : t("childNotRegistered", { name: s.name })
                    : isRegistered
                      ? t("registered")
                      : t("notRegistered")}
                </Typography>
              </Box>

              {isRegistered ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  disabled={busy}
                  onClick={() => regId && regId !== "pending" && handleUnregister(s, regId)}
                  startIcon={busy ? <CircularProgress size={14} /> : undefined}
                  sx={{ fontWeight: 700 }}
                >
                  {t("unregister")}
                </Button>
              ) : canActNow && !needsRole ? (
                <Button
                  size="small"
                  variant="contained"
                  disabled={busy}
                  onClick={() => handleRegister(s)}
                  startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
                  sx={{ fontWeight: 700 }}
                >
                  {s.kind === "child" ? t("registerChild", { name: s.name }) : t("register")}
                </Button>
              ) : null}
            </Box>
          );
        })}

        {/* Motivi per cui l'azione rapida non c'è: restrizione di ruolo o di
            squadra, oppure ruolo Baskin ancora da assegnare. */}
        {subjects.some((s) => !s.allowed && s.reason) && (
          <Typography variant="caption" color="text.secondary">
            {subjects.find((s) => !s.allowed && s.reason)!.reason}
          </Typography>
        )}
        {subjects.some((s) => s.allowed && s.sportRole == null && s.registrationId === null) && (
          <Typography variant="caption" color="text.secondary">
            {t("needsRoleToRegister")}
          </Typography>
        )}
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Link href={training.href} style={{ textDecoration: "none" }}>
          <Button
            size="small"
            endIcon={<OpenInNewIcon sx={{ fontSize: "0.9rem !important" }} />}
            sx={{ fontWeight: 700 }}
          >
            {t("openTraining")}
          </Button>
        </Link>
      </Box>
    </Paper>
  );
}
