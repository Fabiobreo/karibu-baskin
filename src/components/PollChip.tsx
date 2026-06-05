"use client";

import { Chip } from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/lib/useHasMounted";

interface PollChipProps {
  /** Scadenza del sondaggio; null = senza scadenza. */
  closesAt: Date | string | null;
}

/**
 * Chip "Sondaggio" / "Sondaggio chiuso".
 *
 * Lo stato "chiuso" dipende da `new Date()`, un valore dinamico: calcolarlo in
 * fase di render (SSR + cache di pagina) causa hydration mismatch perché il
 * confronto con l'ora corrente diverge tra HTML servito e idratazione del
 * client. Per questo lo stato chiuso viene risolto solo DOPO il mount
 * (`useHasMounted`): SSR e primo render client mostrano sempre la variante
 * "aperto", poi il client aggiorna — nessun mismatch. Vedi CLAUDE.md.
 */
export default function PollChip({ closesAt }: PollChipProps) {
  const mounted = useHasMounted();
  const t = useTranslations("poll");
  const closed = mounted && closesAt ? new Date(closesAt) <= new Date() : false;

  return (
    <Chip
      icon={<HowToVoteIcon sx={{ fontSize: 16 }} />}
      label={closed ? t("closedBadge") : t("badge")}
      size="small"
      color={closed ? "default" : "primary"}
      sx={{ fontWeight: 700 }}
    />
  );
}
