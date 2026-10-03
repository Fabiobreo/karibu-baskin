"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import type { TeamsData } from "@/components/training/TeamDisplay";
import ShareTeamsButton from "@/components/training/ShareTeamsButton";
import RowActions from "@/components/admin/RowActions";

/** Segna il titolo della sezione squadre, punto fisso del focus dopo la rimozione. */
const HEADING_ATTR = "data-teams-heading"; // stesso nome dell'attributo sull'h2

/**
 * Titolo "Squadre" e azioni (UX-47): "Condividi" con l'etichetta, per tutti;
 * per lo staff un "⋯" con "Modifica squadre" e "Rimuovi squadre…", che chiede
 * sempre conferma. Condiviso da pagina dell'allenamento, `AllenamentoEndedView`
 * e `AdminSessionTeams`: i testi passano dai dizionari.
 */
export default function TeamsHeader({
  teams,
  coaches,
  sessionTitle,
  sessionDate,
  sessionEndTime,
  isStaff,
  isEnded = false,
  removingTeams,
  onRemoveTeams,
  onEditTeams,
  editMode = false,
}: {
  teams: TeamsData | null;
  coaches?: { id: string; name: string }[];
  sessionTitle?: string;
  sessionDate?: string | Date;
  sessionEndTime?: string | Date | null;
  isStaff: boolean;
  isEnded?: boolean;
  removingTeams: boolean;
  /** Rimuove subito: la conferma la chiede questo componente. */
  onRemoveTeams: () => void | Promise<void>;
  /** Entra o esce dalla modifica: la voce dice "Fine modifica" quando è attiva. */
  onEditTeams?: () => void;
  editMode?: boolean;
}) {
  const t = useTranslations("nav");
  const tActions = useTranslations("teamsActions");
  const tCommon = useTranslations("common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const staffActions = isStaff && !isEnded;

  // Dopo "Rimuovi squadre" il "⋯" sparisce (e la sezione può rimontare in un
  // altro layout): il focus va sul titolo "Squadre", cercato di nuovo nel DOM.
  async function removeAndRefocus() {
    await onRemoveTeams();
    requestAnimationFrame(() =>
      setTimeout(() => {
        const active = document.activeElement;
        if (active && active !== document.body && active.isConnected) return;
        document.querySelector<HTMLElement>(`[${HEADING_ATTR}]`)?.focus();
      }, 0)
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        mb: 1,
      }}
    >
      <Typography
        component="h2"
        variant="h6"
        tabIndex={-1}
        data-teams-heading=""
        sx={{ outline: "none" }}
      >
        {t("teams")}
      </Typography>
      {teams && (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          {sessionTitle && (
            <ShareTeamsButton
              teams={teams}
              coaches={coaches}
              sessionTitle={sessionTitle}
              sessionDate={sessionDate}
              sessionEndTime={sessionEndTime}
            />
          )}
          {staffActions && removingTeams && (
            <CircularProgress size={20} aria-label={tActions("removing")} />
          )}
          {staffActions && (
            <RowActions
              subject={t("teams")}
              menuLabel={tActions(sessionTitle ? "moreActions" : "actions")}
              items={
                onEditTeams
                  ? [{ label: tActions(editMode ? "doneEditing" : "edit"), onClick: onEditTeams }]
                  : undefined
              }
              onDelete={removingTeams ? undefined : () => setConfirmOpen(true)}
              deleteLabel={tActions("remove")}
              deleteConfirm={false}
            />
          )}
        </Box>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="teams-remove-title"
        aria-describedby="teams-remove-description"
      >
        <DialogTitle id="teams-remove-title">{tActions("removeTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText id="teams-remove-description">
            {tActions("removeMessage")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{tCommon("cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmOpen(false);
              void removeAndRefocus();
            }}
          >
            {tActions("removeConfirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
