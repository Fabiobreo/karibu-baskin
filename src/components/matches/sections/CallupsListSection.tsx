"use client";

import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import LockIcon from "@mui/icons-material/Lock";
import { useTranslations } from "next-intl";
import CallupRow from "@/components/matches/CallupRow";
import type { CallupWithStat } from "@/components/matches/matchDetailTypes";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface CallupsListSectionProps {
  callups: CallupWithStat[];
  canSeeCallups: boolean;
  hasScore: boolean;
  /** Colore salvato della squadra dei convocati: tinta degli avatar. */
  teamColor?: string | null;
}

/**
 * Lista convocati raggruppata per ruolo Baskin (1-5), con la sezione
 * "ruolo non assegnato" (gated per i non membri). A partita giocata i
 * convocati sono chi ha giocato: chi non ha una riga di statistiche (niente
 * punti né falli da segnare) resta nel suo ruolo, senza punteggio.
 */
export default function CallupsListSection({
  callups,
  canSeeCallups,
  hasScore,
  teamColor = null,
}: CallupsListSectionProps) {
  const t = useTranslations("matches");
  const tNav = useTranslations("nav");

  if (!canSeeCallups) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <LockIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1.5 }} />
        <Typography variant="h6" color="text.secondary">
          {t("membersOnly")}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, mb: 2.5, maxWidth: 360, mx: "auto" }}
        >
          {t("callupsRestricted")}
        </Typography>
        <Button href="/login" variant="contained" color="primary">
          {tNav("login")}
        </Button>
      </Box>
    );
  }

  if (callups.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <GroupsIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
        <Typography variant="h6" color="text.secondary">
          {t("noCallups")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t("callupsUnavailable")}
        </Typography>
      </Box>
    );
  }

  // Raggruppamento: convocati per ruolo vs senza ruolo
  const byRole = new Map<number, CallupWithStat[]>();
  const noRole: CallupWithStat[] = [];

  for (const c of callups) {
    const role = (c.user ?? c.child)?.sportRole ?? null;
    if (!role) {
      noRole.push(c);
      continue;
    }
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role)!.push(c);
  }

  // Ordine per ruolo crescente; dentro ogni ruolo: punti decrescenti se giocata, altrimenti nome
  const sortedRoles = [1, 2, 3, 4, 5].filter((r) => byRole.has(r));
  for (const r of sortedRoles) {
    byRole
      .get(r)!
      .sort((a, b) =>
        hasScore && (a.stat?.points ?? 0) !== (b.stat?.points ?? 0)
          ? (b.stat?.points ?? 0) - (a.stat?.points ?? 0)
          : ((a.user ?? a.child)?.name ?? "").localeCompare((b.user ?? b.child)?.name ?? "")
      );
  }

  const groupLabelSx = {
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontSize: "0.75rem",
    display: "block",
    mb: 1,
  } as const;

  return (
    <Stack spacing={3}>
      {sortedRoles.map((role) => {
        const list = byRole.get(role)!;
        return (
          <Box key={role}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography
                variant="caption"
                fontWeight={FONT_WEIGHT.semibold}
                sx={{ ...groupLabelSx, mb: 0, color: "text.secondary" }}
              >
                {t("roleWithCount", { role, count: list.length })}
              </Typography>
            </Box>
            <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
              <Stack divider={<Divider />}>
                {list.map((c) => (
                  <CallupRow key={c.id} c={c} hasScore={hasScore} teamColor={teamColor} />
                ))}
              </Stack>
            </Paper>
          </Box>
        );
      })}

      {noRole.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            fontWeight={FONT_WEIGHT.semibold}
            sx={{ ...groupLabelSx, color: "text.secondary" }}
          >
            {t("unassignedRole", { count: noRole.length })}
          </Typography>
          <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
            <Stack divider={<Divider />}>
              {noRole.map((c) => (
                <CallupRow key={c.id} c={c} hasScore={hasScore} teamColor={teamColor} />
              ))}
            </Stack>
          </Paper>
        </Box>
      )}
    </Stack>
  );
}
