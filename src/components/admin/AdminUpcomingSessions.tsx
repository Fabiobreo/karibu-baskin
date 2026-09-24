"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, Paper, Button, Chip } from "@mui/material";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import ManageParticipantsDialog, {
  type ParticipantRegistration,
} from "@/components/admin/ManageParticipantsDialog";
import { ROLE_COLORS } from "@/lib/constants";

export interface AdminUpcomingSessionRow {
  id: string;
  title: string;
  date: string;
  dateSlug: string | null;
  registrations: (ParticipantRegistration & { name: string; role: number })[];
}

interface AdminUpcomingSessionsProps {
  sessions: AdminUpcomingSessionRow[];
}

function UpcomingCard({ s }: { s: AdminUpcomingSessionRow }) {
  const [managing, setManaging] = useState(false);
  const router = useRouter();
  const athletes = s.registrations.filter((r) => !r.registeredAsCoach);
  const coaches = s.registrations.length - athletes.length;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/allenamento/${s.dateSlug ?? s.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ "&:hover": { textDecoration: "underline" } }}
            >
              {s.title}
            </Typography>
          </Link>
          <Typography variant="caption" color="text.secondary">
            {format(new Date(s.date), "EEEE d MMMM · HH:mm", { locale: it })}
            {" · "}
            {athletes.length} {athletes.length === 1 ? "iscritto" : "iscritti"}
            {coaches > 0 && ` + ${coaches} ${coaches === 1 ? "allenatore" : "allenatori"}`}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ManageAccountsIcon />}
          onClick={() => setManaging(true)}
          sx={{ minHeight: 36, fontWeight: 700, flexShrink: 0 }}
        >
          Iscritti
        </Button>
      </Box>

      {athletes.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5 }}>
          {athletes.map((a) => (
            <Chip
              key={a.id}
              size="small"
              variant="outlined"
              label={a.name}
              icon={
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: ROLE_COLORS[a.role] ?? "text.disabled",
                    ml: "8px !important",
                  }}
                />
              }
            />
          ))}
        </Box>
      )}

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
    </Paper>
  );
}

/**
 * Allenamenti futuri, gli stessi di "Prossimi allenamenti" su /allenamenti:
 * lo staff iscrive chi non ci è riuscito da solo (iscrizioni chiuse, niente
 * account, telefono scarico), senza finestre temporali né restrizioni.
 */
export default function AdminUpcomingSessions({ sessions }: AdminUpcomingSessionsProps) {
  if (sessions.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 5 }}>
      <Typography
        variant="overline"
        component="h2"
        fontWeight={800}
        color="text.secondary"
        sx={{ letterSpacing: "0.1em" }}
      >
        Prossimi allenamenti · {sessions.length}
      </Typography>
      {sessions.map((s) => (
        <UpcomingCard key={s.id} s={s} />
      ))}
    </Box>
  );
}
