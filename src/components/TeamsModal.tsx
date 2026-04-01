"use client";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid2 as Grid,
  IconButton,
  Typography,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { TeamColumn, AlignedTeamGrid } from "@/components/TeamDisplay";

interface Athlete {
  id: string;
  name: string;
  role: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sessionTitle: string;
  teamA: Athlete[];
  teamB: Athlete[];
  teamC?: Athlete[];
}

export default function TeamsModal({ open, onClose, sessionTitle, teamA, teamB, teamC }: Props) {
  const numTeams = teamC ? 3 : 2;
  const colSize = numTeams === 3 ? { xs: 12, md: 4 } : { xs: 12, md: 6 };
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
        <Box>
          <Typography variant="h6" fontWeight={700}>Squadre</Typography>
          <Typography variant="caption" color="text.secondary">{sessionTitle}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        {isDesktop ? (
          <AlignedTeamGrid teams={teamsData} />
        ) : (
          <Grid container spacing={2}>
            <Grid size={colSize}>
              <TeamColumn name="Arancioni" athletes={teamA} color="#E65100" />
            </Grid>
            <Grid size={colSize}>
              <TeamColumn name="Neri" athletes={teamB} color="#1A1A1A" />
            </Grid>
            {teamC && (
              <Grid size={colSize}>
                <TeamColumn name="Bianchi" athletes={teamC} color="#757575" />
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}
