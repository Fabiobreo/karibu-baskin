"use client";
import {
  Button,
  Box,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface Props {
  open: boolean;
  sessionTitle?: string;
  onClose: () => void;
  onConfirm: (numTeams: 2 | 3) => void;
}

export default function PickTeamsDialog({ open, sessionTitle, onClose, onConfirm }: Props) {
  return (
    <ResponsiveDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={FONT_WEIGHT.semibold}>Quante squadre?</DialogTitle>
      <DialogContent>
        {sessionTitle && (
          <DialogContentText>
            Scegli il numero di squadre per <strong>{sessionTitle}</strong>.
          </DialogContentText>
        )}
        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => onConfirm(2)}
            sx={{ py: 1.5, fontSize: TYPE_SCALE.md }}
          >
            2 squadre
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => onConfirm(3)}
            sx={{ py: 1.5, fontSize: TYPE_SCALE.md }}
          >
            3 squadre
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
