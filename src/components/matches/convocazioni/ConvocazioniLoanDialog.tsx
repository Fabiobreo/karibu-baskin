"use client";
import { useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { sportRoleLabel, roleColor } from "@/lib/constants";
import RoleBadge from "@/components/common/RoleBadge";
import type { LoanCandidate } from "@/lib/matches/callupContext";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";

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
      <DialogTitle sx={{ fontWeight: FONT_WEIGHT.bold }}>
        Aggiungi giocatore in prestito
      </DialogTitle>
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
                    fontSize: TYPE_SCALE.xs,
                    mr: 1,
                    bgcolor: role ? roleColor(role) : "grey.400",
                  }}
                >
                  {o.candidate.name[0]}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold} noWrap>
                    {o.candidate.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {o.teamName}
                  </Typography>
                </Box>
                {role && <RoleBadge role={role} variant={o.candidate.sportRoleVariant} />}
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
