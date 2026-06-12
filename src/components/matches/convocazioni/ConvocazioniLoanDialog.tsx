"use client";
import { useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { ROLE_COLORS, sportRoleLabel } from "@/lib/constants";
import type { LoanCandidate } from "@/lib/callupContext";

function candidateKey(c: LoanCandidate): string {
  return `${c.candidate.kind}-${c.candidate.id}`;
}

/**
 * Dialog per aggiungere un giocatore in prestito da un'altra squadra della
 * stagione. Filtra i candidati già presenti (membri o prestiti già aggiunti).
 */
export default function ConvocazioniLoanDialog({
  open,
  onClose,
  pool,
  excludeKeys,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  pool: LoanCandidate[];
  excludeKeys: Set<string>;
  onAdd: (candidate: LoanCandidate) => void;
}) {
  const [value, setValue] = useState<LoanCandidate | null>(null);

  const options = pool.filter((c) => !excludeKeys.has(candidateKey(c)));

  function handleConfirm() {
    if (!value) return;
    onAdd(value);
    setValue(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>Aggiungi giocatore in prestito</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Giocatori di altre squadre della stagione. Verranno marcati come prestito.
        </Typography>
        <Autocomplete
          value={value}
          onChange={(_, v) => setValue(v)}
          options={options}
          getOptionLabel={(o) => o.candidate.name}
          isOptionEqualToValue={(a, b) => candidateKey(a) === candidateKey(b)}
          noOptionsText="Nessun giocatore disponibile"
          renderOption={(props, o) => {
            const role = o.candidate.sportRole;
            return (
              <Box component="li" {...props} key={candidateKey(o)}>
                <Avatar
                  src={o.candidate.image ?? undefined}
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: 12,
                    mr: 1,
                    bgcolor: role ? ROLE_COLORS[role] : "grey.400",
                  }}
                >
                  {o.candidate.name[0]}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {o.candidate.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {o.teamName}
                  </Typography>
                </Box>
                {role && (
                  <Chip
                    label={sportRoleLabel(role, o.candidate.sportRoleVariant)}
                    size="small"
                    sx={{
                      bgcolor: ROLE_COLORS[role],
                      color: "common.white",
                      fontWeight: 600,
                      fontSize: "0.58rem",
                      height: 16,
                    }}
                  />
                )}
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField {...params} label="Cerca giocatore" autoFocus placeholder="Nome..." />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Annulla
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!value}>
          Aggiungi
        </Button>
      </DialogActions>
    </Dialog>
  );
}
