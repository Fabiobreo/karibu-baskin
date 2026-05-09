"use client";
import React, { useState, useCallback } from "react";
import { Box, Button, Paper } from "@mui/material";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import RosterByRole from "@/components/RosterByRole";
import TeamDisplay, { type TeamsData } from "@/components/TeamDisplay";
import TrainingMatchResults from "@/components/TrainingMatchResults";
import TeamsHeader from "@/components/TeamsHeader";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";

type RosterProps = React.ComponentProps<typeof RosterByRole>;
type TeamDisplayProps = React.ComponentProps<typeof TeamDisplay>;

interface Props {
  teams: TeamsData | null;
  sessionId: string;
  sessionTitle?: string;
  sessionDate?: string | Date;
  sessionEndTime?: string | Date | null;
  isStaff: boolean;
  rosterProps: RosterProps;
  teamDisplayProps: TeamDisplayProps;
  removingTeams: boolean;
  onRemoveTeams: () => void;
}

export default function AllenamientoEndedView({
  teams,
  sessionId,
  sessionTitle,
  sessionDate,
  sessionEndTime,
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
            sessionDate={sessionDate}
            sessionEndTime={sessionEndTime}
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
