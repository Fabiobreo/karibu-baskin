"use client";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { AlignedTeamGrid, MobileTeamTabs } from "@/components/TeamDisplay";
import ShareTeamsButton from "@/components/ShareTeamsButton";

interface Athlete {
  id: string;
  name: string;
  role: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sessionTitle: string;
  sessionDate?: string | Date;
  sessionEndTime?: string | Date | null;
  teamA: Athlete[];
  teamB: Athlete[];
  teamC?: Athlete[];
  coaches?: { id: string; name: string }[];
}

export default function TeamsModal({ open, onClose, sessionTitle, sessionDate, sessionEndTime, teamA, teamB, teamC, coaches }: Props) {
  const numTeams = teamC ? 3 : 2;
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const teamsData = {
    teamA,
    teamB,
    ...(teamC ? { teamC } : {}),
    numTeams: numTeams as 2 | 3,
    generated: true,
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
        <Typography variant="h6">{sessionTitle}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <ShareTeamsButton teams={teamsData} coaches={coaches} sessionTitle={sessionTitle} sessionDate={sessionDate} sessionEndTime={sessionEndTime} />
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        {isDesktop ? (
          <AlignedTeamGrid teams={teamsData} />
        ) : (
          <MobileTeamTabs teams={teamsData} />
        )}

        {coaches && coaches.length > 0 && (
          <Box sx={{ mt: 1.5, display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ whiteSpace: "nowrap" }}>
              Allenatori:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {coaches.map((c) => (
                <Chip key={c.id} size="small" label={c.name} variant="outlined" sx={{ fontSize: "0.75rem" }} />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
