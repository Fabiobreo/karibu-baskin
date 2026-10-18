"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ShareIcon from "@mui/icons-material/Share";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { useNotifyCallups } from "@/hooks/useNotifyCallups";
import { shareElementAsImage, shareFileName } from "@/lib/shareImage";
import { TOUCH_TARGET_ON_PHONE } from "@/lib/touchTarget";
import CallupsShareCard, { type CallupsShareInfo } from "@/components/matches/CallupsShareCard";
import type { CallupEntry } from "@/components/matches/matchDetailTypes";

interface CallupsActionsProps {
  matchId: string;
  callups: CallupEntry[];
  shareInfo: CallupsShareInfo;
  /** Partita non iniziata e almeno un convocato (`canNotifyCallups`). */
  canNotify: boolean;
}

/**
 * Azioni dello staff sui convocati, sulla riga del titolo "Convocati": da `sm`
 * tre bottoni (Condividi, Avvisa i convocati, Gestisci convocati), su telefono
 * "Gestisci" e un "⋯" con le altre due, per stare su una riga.
 */
export default function CallupsActions({
  matchId,
  callups,
  shareInfo,
  canNotify,
}: CallupsActionsProps) {
  const t = useTranslations("matches");
  const { showToast } = useToast();
  const notify = useNotifyCallups(matchId, callups.length);
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const hasCallups = callups.length > 0;

  async function handleShare() {
    setMenuAnchor(null);
    if (!cardRef.current || sharing) return;
    setSharing(true);
    try {
      await shareElementAsImage(cardRef.current, {
        title: t("shareCallupsSubject", { title: shareInfo.title }),
        fileName: shareFileName("convocati", shareInfo.title),
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("[share callups]", err);
        showToast({ message: t("shareCallupsError"), severity: "error" });
      }
    } finally {
      setSharing(false);
    }
  }

  function handleNotify() {
    setMenuAnchor(null);
    notify.requestNotify();
  }

  const shareLabel = sharing ? t("shareCallupsGenerating") : t("shareCallups");
  const shareIcon = sharing ? <CircularProgress size={14} /> : <ShareIcon />;
  const notifyIcon = notify.isPending ? (
    <CircularProgress size={14} />
  ) : (
    <NotificationsActiveOutlinedIcon />
  );

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
      {hasCallups && <CallupsShareCard ref={cardRef} callups={callups} info={shareInfo} />}

      {/* Da `sm`: tutte le azioni con l'etichetta. */}
      {hasCallups && (
        <Button
          size="small"
          onClick={handleShare}
          disabled={sharing}
          aria-busy={sharing || undefined}
          startIcon={shareIcon}
          sx={{ display: { xs: "none", sm: "inline-flex" } }}
        >
          {shareLabel}
        </Button>
      )}
      {canNotify && (
        <Button
          size="small"
          onClick={handleNotify}
          disabled={notify.isPending}
          startIcon={notifyIcon}
          sx={{ display: { xs: "none", sm: "inline-flex" } }}
        >
          {t("callupsNotify")}
        </Button>
      )}
      <Button
        href={`/admin/partite/${matchId}/convocazioni`}
        variant="outlined"
        size="small"
        startIcon={<EditIcon />}
        sx={{ whiteSpace: "nowrap", ...TOUCH_TARGET_ON_PHONE }}
      >
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
          {t("manageCallups")}
        </Box>
        <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
          {t("manageCallupsShort")}
        </Box>
      </Button>

      {/* Su telefono: le altre due nel "⋯". */}
      {(hasCallups || canNotify) && (
        <IconButton
          aria-label={t("callupsMoreActions")}
          aria-haspopup="menu"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ display: { xs: "inline-flex", sm: "none" }, width: 44, height: 44 }}
        >
          <MoreHorizIcon />
        </IconButton>
      )}
      <Menu
        anchorEl={menuAnchor}
        open={menuAnchor !== null}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {hasCallups && (
          <MenuItem onClick={handleShare} disabled={sharing}>
            <ListItemIcon>{shareIcon}</ListItemIcon>
            <ListItemText>{shareLabel}</ListItemText>
          </MenuItem>
        )}
        {canNotify && (
          <MenuItem onClick={handleNotify} disabled={notify.isPending}>
            <ListItemIcon>{notifyIcon}</ListItemIcon>
            <ListItemText>{t("callupsNotify")}</ListItemText>
          </MenuItem>
        )}
      </Menu>
      {notify.ConfirmDialog}
    </Box>
  );
}
