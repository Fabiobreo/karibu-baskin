"use client";
import { Box, Button, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import CheckIcon from "@mui/icons-material/Check";
import { usePeopleSearch, type AdminPerson } from "@/components/admin/people/usePeopleSearch";
import PersonRow from "@/components/admin/people/PersonRow";

interface ExistingChildMatchesProps {
  /** Il nome che lo staff sta scrivendo nel form del nuovo figlio. */
  name: string;
  parent: AdminPerson;
  linkingId: string | null;
  onLink: (child: AdminPerson) => void;
}

/**
 * Sotto il campo nome del nuovo figlio: i figli già registrati con un nome
 * simile, con i loro genitori. Il caso tipico è il secondo genitore: la mamma
 * ha già registrato Luca, e invece di un doppione (presenze e statistiche
 * divise su due schede) lo si collega anche al papà con un tocco.
 *
 * Compare solo quando c'è qualcosa da proporre: con zero risultati non occupa
 * spazio, e il form resta quello di sempre.
 */
export default function ExistingChildMatches({
  name,
  parent,
  linkingId,
  onLink,
}: ExistingChildMatchesProps) {
  // Da 3 lettere: con 2 ("Lu") i suggerimenti sarebbero rumore.
  const query = name.trim().length >= 3 ? name : "";
  const { people, searching } = usePeopleSearch(query, "child");
  if (people.length === 0) {
    return searching ? (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
        <CircularProgress size={14} color="inherit" />
        <Typography variant="caption">Controllo se è già registrato…</Typography>
      </Box>
    ) : null;
  }

  const firstName = parent.name.split(" ")[0];
  return (
    <Paper
      variant="outlined"
      sx={{ px: 1.5, pt: 1.25, borderColor: "warning.main", bgcolor: "action.hover" }}
    >
      <Typography variant="body2" fontWeight={700}>
        È già registrato?
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p">
        Se è uno di questi, collegalo a {firstName} invece di crearne un doppione.
      </Typography>
      {people.map((c) => {
        const alreadyLinked = c.guardianIds.includes(parent.id);
        const busy = linkingId === c.id;
        return (
          <PersonRow
            key={c.id}
            name={c.name}
            sportRole={c.sportRole}
            meta={c.parentName ? `Figlio di ${c.parentName}` : "Nessun genitore collegato"}
            trailing={
              alreadyLinked ? (
                <Chip icon={<CheckIcon />} label={`Già di ${firstName}`} size="small" />
              ) : (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => onLink(c)}
                  disabled={linkingId !== null}
                  startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
                  sx={{ minHeight: 44 }}
                >
                  Collega
                </Button>
              )
            }
          />
        );
      })}
    </Paper>
  );
}
