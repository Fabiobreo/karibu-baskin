"use client";

import { Box, Paper, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import MembersOnlyNotice from "@/components/common/MembersOnlyNotice";
import CallupRow from "@/components/matches/CallupRow";
import type { CallupWithStat } from "@/components/matches/matchDetailTypes";
import RoleBadge from "@/components/common/RoleBadge";
import { groupCallupsByRole } from "@/lib/matches/callupGroups";

interface CallupsListSectionProps {
  callups: CallupWithStat[];
  canSeeCallups: boolean;
  hasScore: boolean;
  /** Colore salvato della squadra dei convocati: tinta degli avatar. */
  teamColor?: string | null;
  /** Chi guarda e i suoi figli: le loro righe hanno l'etichetta "Tu" / "Famiglia". */
  viewer?: CallupViewer;
}

/**
 * Le chiavi di chi guarda: il suo account e quelli dei figli che ne hanno uno
 * (la convocazione sta sull'account, @/lib/person), le schede dei figli.
 */
export interface CallupViewer {
  userId: string | null;
  familyUserIds: string[];
  childIds: string[];
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
  viewer,
}: CallupsListSectionProps) {
  const t = useTranslations("matches");
  // Chi ha già fatto l'accesso (account in attesa) non deve sentirsi dire "Accedi".
  const { data: session } = useSession();

  if (!canSeeCallups) {
    return (
      <MembersOnlyNotice
        viewer={session?.user ? "guest" : "anonymous"}
        what="callups"
        variant="block"
      />
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

  // Per ruolo crescente; dentro un ruolo per punti se giocata, poi per nome.
  const groups = groupCallupsByRole(callups, hasScore ? (c) => c.stat?.points ?? 0 : undefined);

  const mineLabel = (c: CallupWithStat): string | null => {
    if (!viewer) return null;
    if (viewer.userId && c.userId === viewer.userId) return t("callupYou");
    if (c.userId && viewer.familyUserIds.includes(c.userId)) return t("callupFamily");
    if (c.childId && viewer.childIds.includes(c.childId)) return t("callupFamily");
    return null;
  };

  // Distinta: una card per ruolo, due affiancate da `md`; dentro, su telefono
  // i giocatori stanno in due colonne, da `md` uno per riga.
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
        gap: { xs: 1.5, md: 2 },
        alignItems: "start",
      }}
    >
      {groups.map(({ role, list }) => (
        <Paper
          key={role ?? "none"}
          component="section"
          aria-label={
            role
              ? t("roleWithCount", { role, count: list.length })
              : t("unassignedRole", { count: list.length })
          }
          elevation={0}
          variant="outlined"
          sx={{ overflow: "hidden" }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            {role && <RoleBadge role={role} />}
            <Typography variant="body2" color="text.secondary" aria-hidden="true">
              {role
                ? t("playersCount", { count: list.length })
                : t("unassignedRole", { count: list.length })}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "minmax(0, 1fr)" },
              "& > * + *": { borderTop: { md: "1px solid" }, borderColor: { md: "divider" } },
            }}
          >
            {list.map((c) => (
              <CallupRow
                key={c.id}
                c={c}
                hasScore={hasScore}
                teamColor={teamColor}
                mine={mineLabel(c)}
              />
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
