"use client";
import { Box, Chip } from "@mui/material";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { bibSurfaceSx } from "@/lib/bib";
import type { FamilyTeam } from "@/lib/trainingTeams";

/** Il nome di battesimo basta a distinguere i figli, e tiene il chip corto. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

interface FamilyTeamChipsProps {
  teams: FamilyTeam[];
  /** A destra nelle righe delle liste (default), a sinistra nelle card. */
  align?: "start" | "end";
}

/**
 * In che squadra sono chi guarda e i suoi figli: "Neri" per sé, "Luca · Neri"
 * per un figlio. Casacca piena col nome (UX-29), col contorno dove il nero
 * sparirebbe nel tema scuro (`bibSurfaceSx`).
 */
export default function FamilyTeamChips({ teams, align = "end" }: FamilyTeamChipsProps) {
  const t = useTranslations("trainings");
  const { teamColorLabel } = useEntityLabels();
  // Due figli con lo stesso nome di battesimo: allora il nome intero.
  const firstNames = teams.filter((ft) => !ft.self).map((ft) => firstName(ft.name));
  const shownName = (name: string) =>
    firstNames.filter((n) => n === firstName(name)).length > 1 ? name : firstName(name);
  // Da solo il proprio chip dice solo la squadra; accanto ai figli dice "Tu".
  const withOthers = teams.length > 1;
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: `flex-${align}` }}>
      {teams.map((ft) => (
        <Chip
          key={ft.id}
          size="small"
          label={
            ft.self
              ? withOthers
                ? t("familyTeamSelf", { team: teamColorLabel(ft.key) })
                : teamColorLabel(ft.key)
              : t("familyTeam", { name: shownName(ft.name), team: teamColorLabel(ft.key) })
          }
          sx={bibSurfaceSx(ft.key)}
        />
      ))}
    </Box>
  );
}
