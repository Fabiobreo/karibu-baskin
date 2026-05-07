"use client";
import {
  Button, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
} from "@mui/material";

interface Props {
  open: boolean;
  sessionTitle?: string;
  onClose: () => void;
  onConfirm: (numTeams: 2 | 3) => void;
}

export default function PickTeamsDialog({ open, sessionTitle, onClose, onConfirm }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={700}>Quante squadre?</DialogTitle>
      <DialogContent>
        {sessionTitle && (
          <DialogContentText>
            Scegli il numero di squadre per <strong>{sessionTitle}</strong>.
          </DialogContentText>
        )}
        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button variant="contained" fullWidth onClick={() => onConfirm(2)} sx={{ py: 1.5, fontSize: "1rem" }}>
            2 squadre
          </Button>
          <Button variant="outlined" fullWidth onClick={() => onConfirm(3)} sx={{ py: 1.5, fontSize: "1rem" }}>
            3 squadre
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
      </DialogActions>
    </Dialog>
  );
}
