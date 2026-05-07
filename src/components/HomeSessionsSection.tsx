"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Grid2 as Grid, Typography, Button } from "@mui/material";
import SessionCard, { type SessionWithCount } from "@/components/SessionCard";
import SessionHeroCard from "@/components/SessionHeroCard";
import { useToast } from "@/context/ToastContext";
import PickTeamsDialog from "@/components/PickTeamsDialog";

export default function HomeSessionsSection({
  inCorso: initInCorso,
  upcoming: initUpcoming,
  registrationIdBySession,
  isStaff,
}: {
  inCorso: SessionWithCount[];
  upcoming: SessionWithCount[];
  registrationIdBySession: Record<string, string>;
  isStaff: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [inCorso, setInCorso] = useState(initInCorso);
  const [upcoming, setUpcoming] = useState(initUpcoming);

  const [generating, setGenerating] = useState<string | null>(null);
  const [removingTeams, setRemovingTeams] = useState<string | null>(null);
  const [teamPickSession, setTeamPickSession] = useState<SessionWithCount | null>(null);

  function updateSession(id: string, patch: Partial<SessionWithCount>) {
    const apply = (list: SessionWithCount[]) =>
      list.map((s) => s.id === id ? { ...s, ...patch } : s);
    setInCorso(apply);
    setUpcoming(apply);
  }

  async function handleGenerateTeams(s: SessionWithCount, numTeams: 2 | 3) {
    setTeamPickSession(null);
    setGenerating(s.id);
    try {
      const res = await fetch(`/api/teams/${s.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numTeams }),
      });
      if (res.ok) {
        const newTeams = await res.json();
        updateSession(s.id, { teams: newTeams });
        showToast({ message: `${numTeams} squadre create`, severity: "success" });
        router.refresh();
      } else {
        showToast({ message: "Errore nella creazione delle squadre", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setGenerating(null);
    }
  }

  async function handleRemoveTeams(s: SessionWithCount) {
    setRemovingTeams(s.id);
    try {
      const res = await fetch(`/api/teams/${s.id}`, { method: "DELETE" });
      if (res.ok) {
        updateSession(s.id, { teams: null });
        showToast({ message: "Squadre rimosse", severity: "success" });
        router.refresh();
      } else {
        showToast({ message: "Errore nella rimozione delle squadre", severity: "error" });
      }
    } catch {
      showToast({ message: "Errore di rete, riprova", severity: "error" });
    } finally {
      setRemovingTeams(null);
    }
  }

  if (inCorso.length === 0 && upcoming.length === 0) return null;

  return (
    <>
      {inCorso.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: "50%", bgcolor: "#2E7D32", flexShrink: 0,
              "@keyframes pulse": {
                "0%": { boxShadow: "0 0 0 0 rgba(46,125,50,0.7)" },
                "70%": { boxShadow: "0 0 0 8px rgba(46,125,50,0)" },
                "100%": { boxShadow: "0 0 0 0 rgba(46,125,50,0)" },
              },
              animation: "pulse 1.4s ease-in-out infinite",
            }} />
            <Typography variant="overline" fontWeight={700} sx={{ letterSpacing: "0.1em", color: "#2E7D32" }}>
              In corso
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {inCorso.map((s) => (
              <Grid key={s.id} size={{ xs: 12, sm: inCorso.length > 1 ? 6 : 12 }}>
                <SessionCard
                  session={s}
                  live
                  isRegistered={!!registrationIdBySession[s.id]}
                  myRegistrationId={registrationIdBySession[s.id] ?? null}
                  isStaff={isStaff}
                  onEdit={() => router.push(`/allenamenti?edit=${s.id}`)}
                  onDelete={() => router.push(`/allenamenti?edit=${s.id}`)}
                  onGenerateTeams={() => setTeamPickSession(s)}
                  onRemoveTeams={() => handleRemoveTeams(s)}
                  generating={generating === s.id}
                  removingTeams={removingTeams === s.id}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {upcoming.length > 0 && (
        <>
          <Typography variant="overline" color="text.secondary" fontWeight={700}
            sx={{ letterSpacing: "0.1em", display: "block", mb: 1.5 }}>
            Prossimi allenamenti
          </Typography>
          <Grid container spacing={2}>
            {upcoming.map((s) => (
              <Grid key={s.id} size={{ xs: 12, sm: upcoming.length > 1 ? 6 : 12 }}>
                <SessionHeroCard
                  session={s}
                  isRegistered={!!registrationIdBySession[s.id]}
                  myRegistrationId={registrationIdBySession[s.id] ?? null}
                  isStaff={isStaff}
                  onEdit={() => router.push(`/allenamenti?edit=${s.id}`)}
                  onDelete={() => router.push(`/allenamenti?edit=${s.id}`)}
                  onGenerateTeams={() => setTeamPickSession(s)}
                  onRemoveTeams={() => handleRemoveTeams(s)}
                  generating={generating === s.id}
                  removingTeams={removingTeams === s.id}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <PickTeamsDialog
        open={!!teamPickSession}
        sessionTitle={teamPickSession?.title}
        onClose={() => setTeamPickSession(null)}
        onConfirm={(n) => handleGenerateTeams(teamPickSession!, n)}
      />
    </>
  );
}
