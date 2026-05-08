"use client";
import React, { useState, useCallback } from "react";
import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import GroupsIcon from "@mui/icons-material/Groups";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RosterByRole from "@/components/RosterByRole";
import TeamDisplay, { type TeamsData } from "@/components/TeamDisplay";
import TrainingMatchResults from "@/components/TrainingMatchResults";
import TeamsHeader from "@/components/TeamsHeader";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";
import { ROLE_COLORS, ROLE_LABELS, ROLES } from "@/lib/constants";

type RosterProps = React.ComponentProps<typeof RosterByRole>;
type TeamDisplayProps = React.ComponentProps<typeof TeamDisplay>;

interface Registration {
  id: string;
  name: string;
  role: number;
  registeredAsCoach: boolean;
}

function SummaryCard({
  registrations,
  teams,
}: {
  registrations: Registration[];
  teams: TeamsData | null;
}) {
  const athleteRegs = registrations.filter((r) => !r.registeredAsCoach);
  const coachRegs = registrations.filter((r) => r.registeredAsCoach);
  const roleBreakdown = ROLES
    .map((role) => ({ role, count: athleteRegs.filter((r) => r.role === role).length }))
    .filter((r) => r.count > 0);

  return (
    <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Riepilogo
      </Typography>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: roleBreakdown.length > 0 ? 2 : 0 }}>
        <Chip
          icon={<GroupsIcon />}
          label={`${athleteRegs.length} ${athleteRegs.length === 1 ? "atleta" : "atleti"}`}
          variant="outlined"
        />
        {coachRegs.length > 0 && (
          <Chip
            label={`${coachRegs.length} ${coachRegs.length === 1 ? "allenatore" : "allenatori"}`}
            variant="outlined"
          />
        )}
        {teams && (
          <Chip
            icon={<CheckCircleIcon />}
            label="Squadre create"
            color="success"
            variant="outlined"
          />
        )}
      </Box>

      {roleBreakdown.length > 0 && (
        <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
          {roleBreakdown.map(({ role, count }) => (
            <Box
              key={role}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                bgcolor: ROLE_COLORS[role],
                color: "#fff",
                borderRadius: 1.5,
                px: 1.75,
                py: 0.75,
                minWidth: 52,
              }}
            >
              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1, fontSize: "1.2rem" }}>
                {count}
              </Typography>
              <Typography sx={{ fontWeight: 600, opacity: 0.85, fontSize: "0.62rem", mt: 0.25 }}>
                {ROLE_LABELS[role]}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {athleteRegs.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Nessun partecipante registrato.
        </Typography>
      )}
    </Paper>
  );
}

interface Props {
  registrations: Registration[];
  teams: TeamsData | null;
  sessionId: string;
  sessionTitle?: string;
  isStaff: boolean;
  rosterProps: RosterProps;
  teamDisplayProps: TeamDisplayProps;
  removingTeams: boolean;
  onRemoveTeams: () => void;
}

export default function AllenamientoEndedView({
  registrations,
  teams,
  sessionId,
  sessionTitle,
  isStaff,
  rosterProps,
  teamDisplayProps,
  removingTeams,
  onRemoveTeams,
}: Props) {
  const [matchResultsCount, setMatchResultsCount] = useState(0);
  const handleMatchResultsCount = useCallback((n: number) => setMatchResultsCount(n), []);

  return (
    <>
      <SectionErrorBoundary label="Riepilogo">
        <SummaryCard registrations={registrations} teams={teams} />
      </SectionErrorBoundary>

      {matchResultsCount > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SportsBasketballIcon />}
            onClick={() => document.getElementById("partitelle")?.scrollIntoView({ behavior: "smooth" })}
          >
            Vai ai risultati delle partitelle
          </Button>
        </Box>
      )}
      <SectionErrorBoundary label="Lista iscritti">
        <RosterByRole {...rosterProps} />
      </SectionErrorBoundary>
      {teams && (
        <SectionErrorBoundary label="Risultati partite">
          <TrainingMatchResults
            sessionId={sessionId}
            isStaff={isStaff}
            teams={teams}
            onResultsCount={handleMatchResultsCount}
          />
        </SectionErrorBoundary>
      )}
      <SectionErrorBoundary label="Squadre">
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
          <TeamsHeader
            teams={teams}
            coaches={teamDisplayProps.coaches}
            sessionTitle={sessionTitle}
            isStaff={isStaff}
            isEnded
            removingTeams={removingTeams}
            onRemoveTeams={onRemoveTeams}
          />
          <TeamDisplay {...teamDisplayProps} isStaff={false} />
        </Paper>
      </SectionErrorBoundary>
    </>
  );
}
