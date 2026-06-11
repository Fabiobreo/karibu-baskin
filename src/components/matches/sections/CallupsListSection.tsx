"use client";

import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import LockIcon from "@mui/icons-material/Lock";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROLE_COLORS } from "@/lib/constants";
import CallupRow from "@/components/matches/CallupRow";
import type { CallupWithStat } from "@/components/matches/matchDetailTypes";

interface CallupsListSectionProps {
  callups: CallupWithStat[];
  canSeeCallups: boolean;
  hasScore: boolean;
}

/**
 * Lista convocati raggruppata per ruolo Baskin (1-5), con sezioni
 * "ruolo non assegnato" e "non scesi in campo" (gated per i non membri).
 */
export default function CallupsListSection({
  callups,
  canSeeCallups,
  hasScore,
}: CallupsListSectionProps) {
  const t = useTranslations("matches");
  const tNav = useTranslations("nav");

  if (!canSeeCallups) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <LockIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1.5 }} />
        <Typography variant="h6" color="text.secondary" fontWeight={700}>
          {t("membersOnly")}
        </Typography>
        <Typography
          variant="body2"
          color="text.disabled"
          sx={{ mt: 0.5, mb: 2.5, maxWidth: 360, mx: "auto" }}
        >
          {t("callupsRestricted")}
        </Typography>
        <Link href="/login" style={{ textDecoration: "none" }}>
          <Button variant="contained" color="primary" sx={{ fontWeight: 700 }}>
            {tNav("login")}
          </Button>
        </Link>
      </Box>
    );
  }

  if (callups.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <GroupsIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
        <Typography variant="h6" color="text.secondary" fontWeight={700}>
          {t("noCallups")}
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
          {t("callupsUnavailable")}
        </Typography>
      </Box>
    );
  }

  // Raggruppamento: convocati per ruolo vs senza ruolo vs non scesi in campo
  const byRole = new Map<number, CallupWithStat[]>();
  const noRole: CallupWithStat[] = [];
  const notPlayed: CallupWithStat[] = [];

  for (const c of callups) {
    if (hasScore && !c.stat) {
      notPlayed.push(c);
      continue;
    }
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
        hasScore && a.stat && b.stat
          ? b.stat.points - a.stat.points
          : ((a.user ?? a.child)?.name ?? "").localeCompare((b.user ?? b.child)?.name ?? "")
      );
  }
  notPlayed.sort((a, b) => {
    const ra = (a.user ?? a.child)?.sportRole ?? 99;
    const rb = (b.user ?? b.child)?.sportRole ?? 99;
    return ra !== rb
      ? ra - rb
      : ((a.user ?? a.child)?.name ?? "").localeCompare((b.user ?? b.child)?.name ?? "");
  });

  const groupLabelSx = {
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontSize: "0.65rem",
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
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: ROLE_COLORS[role],
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ ...groupLabelSx, mb: 0, color: "text.secondary" }}
              >
                {t("roleWithCount", { role, count: list.length })}
              </Typography>
            </Box>
            <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
              <Stack divider={<Divider />}>
                {list.map((c) => (
                  <CallupRow key={c.id} c={c} hasScore={hasScore} />
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
            fontWeight={700}
            sx={{ ...groupLabelSx, color: "text.disabled" }}
          >
            {t("unassignedRole", { count: noRole.length })}
          </Typography>
          <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden" }}>
            <Stack divider={<Divider />}>
              {noRole.map((c) => (
                <CallupRow key={c.id} c={c} hasScore={hasScore} />
              ))}
            </Stack>
          </Paper>
        </Box>
      )}

      {hasScore && notPlayed.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ ...groupLabelSx, color: "text.disabled" }}
          >
            {t("notPlayed", { count: notPlayed.length })}
          </Typography>
          <Paper elevation={0} variant="outlined" sx={{ overflow: "hidden", opacity: 0.65 }}>
            <Stack divider={<Divider />}>
              {notPlayed.map((c) => (
                <CallupRow key={c.id} c={c} hasScore={false} />
              ))}
            </Stack>
          </Paper>
        </Box>
      )}
    </Stack>
  );
}
