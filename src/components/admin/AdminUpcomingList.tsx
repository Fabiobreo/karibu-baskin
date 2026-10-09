"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import ScheduleIcon from "@mui/icons-material/Schedule";
import StatusPill from "@/components/common/StatusPill";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import AdminSessionTeams from "@/components/admin/AdminSessionTeams";
import ManageParticipantsDialog, {
  type ParticipantRegistration,
} from "@/components/admin/ManageParticipantsDialog";
import SessionActions from "@/components/admin/SessionActions";
import TrainingReadOnlyDetails from "@/components/admin/TrainingReadOnlyDetails";
import RoleBadge from "@/components/common/RoleBadge";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import type { TeamsData } from "@/lib/schemas";
import { FONT_WEIGHT } from "@/lib/fontWeight";

export interface AdminUpcomingRow {
  id: string;
  title: string;
  date: string;
  endTime: string | null;
  location: string | null;
  dateSlug: string | null;
  registrationOpen: boolean;
  registrationOpenedAt: string | null;
  allowedRoles: number[];
  restrictTeamId: string | null;
  openRoles: number[];
  teams: TeamsData | null;
  registrations: (ParticipantRegistration & { name: string; role: number })[];
}

type RegState = "open" | "closed" | "notYet";

function regState(s: AdminUpcomingRow): RegState {
  if (s.registrationOpen) return "open";
  return s.registrationOpenedAt ? "closed" : "notYet";
}

const REG_LABEL: Record<RegState, string> = {
  open: "Iscrizioni aperte",
  closed: "Iscrizioni chiuse",
  notYet: "Iscrizioni non ancora aperte",
};

function Step({ n, title, children }: { n: number; title?: string; children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ display: "flex", gap: 1.5 }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          bgcolor: "action.selected",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: FONT_WEIGHT.bold,
          flexShrink: 0,
        }}
      >
        {n}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title && (
          <Typography variant="subtitle1" component="h3" sx={{ mb: 1 }}>
            {title}
          </Typography>
        )}
        {children}
      </Box>
    </Box>
  );
}

function UpcomingDetails({ s, initialEdit }: { s: AdminUpcomingRow; initialEdit: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();
  const [managing, setManaging] = useState(false);
  const [busy, setBusy] = useState(false);
  const athletes = s.registrations.filter((r) => !r.registeredAsCoach);
  const state = regState(s);

  async function toggleRegistrations(open: boolean) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/sessions/${s.id}/${open ? "open-registrations" : "close-registrations"}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(await readError(res));
      showToast({
        message: `${open ? "Iscrizioni aperte" : "Iscrizioni chiuse"} (notifica inviata)`,
        severity: "success",
      });
      router.refresh();
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Errore", severity: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <SessionActions session={s} initialEdit={initialEdit} />

      <Step n={1} title={`Iscritti · ${athletes.length}`}>
        {athletes.length > 0 ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
            {athletes.map((a) => (
              <Chip
                key={a.id}
                variant="outlined"
                label={a.name}
                icon={<RoleBadge role={a.role} sx={{ ml: 0.5 }} />}
              />
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Ancora nessun iscritto.
          </Typography>
        )}
        <Button
          variant="outlined"
          startIcon={<ManageAccountsIcon />}
          onClick={() => setManaging(true)}
          sx={{ minHeight: 44 }}
        >
          Gestisci iscritti
        </Button>
        <ManageParticipantsDialog
          open={managing}
          onClose={() => setManaging(false)}
          sessionId={s.id}
          sessionTitle={s.title}
          sessionDate={s.date}
          isPast={false}
          registrations={s.registrations}
          onChanged={() => router.refresh()}
        />
      </Step>

      <Step n={2} title="Iscrizioni">
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {REG_LABEL[state]}.
        </Typography>
        {state === "open" ? (
          <Button
            variant="outlined"
            color="error"
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <LockIcon />}
            onClick={() =>
              openConfirm(
                "Chiudere le iscrizioni?",
                `Per "${s.title}" chi non è iscritto non potrà più iscriversi. Verrà inviata una notifica.`,
                () => toggleRegistrations(false),
                { confirmLabel: "Chiudi e notifica", confirmColor: "error" }
              )
            }
            sx={{ minHeight: 44 }}
          >
            Chiudi iscrizioni
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <LockOpenIcon />}
            onClick={() =>
              openConfirm(
                "Aprire le iscrizioni?",
                `Per "${s.title}" verrà inviata una notifica push e in-app a tutti gli utenti interessati.`,
                () => toggleRegistrations(true),
                { confirmLabel: "Apri e notifica", confirmColor: "primary" }
              )
            }
            sx={{ minHeight: 44 }}
          >
            {state === "closed" ? "Riapri iscrizioni" : "Apri iscrizioni"}
          </Button>
        )}
      </Step>

      {/* Senza titolo: l'intestazione "Squadre" la mette gia' AdminSessionTeams. */}
      <Step n={3}>
        <AdminSessionTeams
          sessionId={s.id}
          sessionTitle={s.title}
          sessionDate={s.date}
          initialTeams={s.teams}
          athletes={athletes.map(({ id, name, role }) => ({ id, name, role }))}
          coaches={s.registrations
            .filter((r) => r.registeredAsCoach)
            .map((r) => ({ id: r.id, name: r.name }))}
        />
      </Step>
      {ConfirmDialog}
    </Box>
  );
}

/**
 * Prossimi allenamenti in admin (UX-14): una riga per allenamento, dentro i
 * passi in ordine (iscritti, iscrizioni, squadre). Prima iscrizioni e squadre
 * si gestivano dalla pagina pubblica /allenamenti.
 */
export default function AdminUpcomingList({
  sessions,
  initialOpenId = null,
  initialEditId = null,
  readOnly = false,
}: {
  sessions: AdminUpcomingRow[];
  initialOpenId?: string | null;
  initialEditId?: string | null;
  /** Dirigente: dentro la riga c'è solo da leggere. */
  readOnly?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(initialOpenId ?? initialEditId);

  if (sessions.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
        <Typography fontWeight={FONT_WEIGHT.semibold}>Nessun allenamento in programma</Typography>
        {!readOnly && (
          <Typography variant="body2" color="text.secondary">
            Crealo con &quot;Nuovo allenamento&quot;.
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Box>
      {sessions.map((s) => {
        const athletes = s.registrations.filter((r) => !r.registeredAsCoach).length;
        const state = regState(s);
        return (
          <Accordion
            key={s.id}
            expanded={openId === s.id}
            onChange={(_, exp) => setOpenId(exp ? s.id : null)}
            disableGutters
            elevation={0}
            slotProps={{ transition: { unmountOnExit: true } }}
            sx={{
              "&::before": { display: "none" },
              mb: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`prossimo-${s.id}`}
              id={`riga-prossimo-${s.id}`}
              sx={{ minHeight: 64, "& .MuiAccordionSummary-content": { minWidth: 0 } }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                  minWidth: 0,
                }}
              >
                <Box sx={{ minWidth: 0, flex: "1 1 220px" }}>
                  <Typography variant="subtitle1" component="h3">
                    {s.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ "&::first-letter": { textTransform: "uppercase" } }}
                  >
                    {format(new Date(s.date), "EEEE d MMMM · HH:mm", { locale: it })} · {athletes}{" "}
                    {athletes === 1 ? "iscritto" : "iscritti"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  {/* Stato temporale (UX-29): forma e icona, niente verde/ambra. */}
                  <StatusPill
                    label={REG_LABEL[state]}
                    variant={
                      state === "open" ? "inverted" : state === "notYet" ? "outlined" : "muted"
                    }
                    icon={
                      state === "open" ? (
                        <LockOpenIcon />
                      ) : state === "notYet" ? (
                        <ScheduleIcon />
                      ) : (
                        <LockIcon />
                      )
                    }
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={s.teams ? "Squadre create" : "Squadre da creare"}
                  />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              {readOnly ? (
                <TrainingReadOnlyDetails
                  sessionId={s.id}
                  athletes={s.registrations.filter((r) => !r.registeredAsCoach)}
                  coaches={s.registrations.filter((r) => r.registeredAsCoach)}
                  teams={s.teams}
                  registrationLabel={REG_LABEL[state]}
                />
              ) : (
                <UpcomingDetails s={s} initialEdit={initialEditId === s.id} />
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
