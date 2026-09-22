"use client";
import { useState } from "react";
import Link from "next/link";
import { Box, CircularProgress, InputAdornment, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { ROLE_LABELS_IT } from "@/lib/constants";
import { usePeopleSearch, type AdminPerson } from "@/components/admin/people/usePeopleSearch";
import PersonRow from "@/components/admin/people/PersonRow";

interface UserSearchPickerProps {
  onPick: (user: AdminPerson) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Utenti da non proporre (es. i genitori già collegati). */
  excludeIds?: string[];
}

/**
 * Ricerca di un utente (nome o email) con risultati toccabili, per scegliere
 * un genitore. Righe intere come bersaglio: sul telefono si tocca il nome,
 * non un pulsantino.
 */
export default function UserSearchPicker({
  onPick,
  placeholder = "Cerca il genitore per nome o email",
  autoFocus,
  excludeIds = [],
}: UserSearchPickerProps) {
  const [query, setQuery] = useState("");
  const { people, searching, enabled, isError } = usePeopleSearch(query, "user");
  const results = people.filter((p) => !excludeIds.includes(p.id));

  return (
    <>
      <TextField
        autoFocus={autoFocus}
        fullWidth
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
            endAdornment: searching ? (
              <InputAdornment position="end">
                <CircularProgress size={18} />
              </InputAdornment>
            ) : null,
          },
          htmlInput: { enterKeyHint: "search", autoComplete: "off" },
        }}
      />
      {enabled && (
        <Box sx={{ mt: 1 }}>
          {isError ? (
            <Hint>Ricerca non riuscita: riprova.</Hint>
          ) : results.length === 0 && !searching ? (
            <Hint>
              Nessun utente trovato. Se il genitore non ha ancora un account,{" "}
              <Link href="/admin/utenti/nuovo">crealo prima qui</Link>.
            </Hint>
          ) : (
            results.map((p) => (
              <Box
                key={p.id}
                component="button"
                type="button"
                onClick={() => {
                  setQuery("");
                  onPick(p);
                }}
                sx={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                  bgcolor: "transparent",
                  color: "inherit",
                  font: "inherit",
                  p: 0,
                  px: 1,
                  borderRadius: 1,
                  cursor: "pointer",
                  "&:hover, &:focus-visible": { bgcolor: "action.hover" },
                }}
              >
                <PersonRow
                  name={p.name}
                  image={p.image}
                  sportRole={null}
                  meta={[p.email, p.appRole && ROLE_LABELS_IT[p.appRole]]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </Box>
            ))
          )}
        </Box>
      )}
    </>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 1 }}>
      {children}
    </Typography>
  );
}
