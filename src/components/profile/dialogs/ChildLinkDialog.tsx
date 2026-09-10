"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import type { ChildData } from "@/components/profile/childLinkerShared";
import { readError } from "@/lib/fetchJson";

interface ChildLinkDialogProps {
  child: ChildData;
  onClose: () => void;
  /** Richiesta inviata (in attesa di conferma dell'altro account). */
  onRequestSent: (requestId: string | null) => void;
  /** Collegamento immediato riuscito. */
  onLinked: (userId: string) => void;
}

/** Dialog "Collega account": invia la richiesta di collegamento via email. */
export default function ChildLinkDialog({
  child,
  onClose,
  onRequestSent,
  onLinked,
}: ChildLinkDialogProps) {
  const t = useTranslations("childLinker");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  async function handleLink() {
    if (!email.trim()) return;
    setLinking(true);
    setEmailError(null);
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkEmail: email.trim() }),
      });
      if (!res.ok) {
        setEmailError(await readError(res));
        return;
      }
      const data = await res.json();
      if (data.pending) {
        // Richiesta inviata, in attesa di conferma
        onRequestSent(data.requestId ?? null);
        showToast({ message: t("requestSentTo", { name: child.name }), severity: "info" });
      } else {
        onLinked(data.userId);
        showToast({ message: t("accountLinkedTo", { name: child.name }), severity: "success" });
      }
      onClose();
    } catch {
      showToast({ message: tCommon("networkError"), severity: "error" });
    } finally {
      setLinking(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("linkAccount", { name: child.name })}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("linkAccountDesc", { name: child.name })}
        </Typography>
        <TextField
          label={t("accountEmail")}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(null);
          }}
          fullWidth
          size="small"
          autoFocus
          error={!!emailError}
          onKeyDown={(e) => e.key === "Enter" && handleLink()}
        />
        {emailError && (
          <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
            {emailError}
          </Alert>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          {t("linkHint")}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={linking}>
          {tCommon("cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleLink}
          disabled={linking || !email.trim()}
          startIcon={linking ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />}
        >
          {linking ? t("sendingRequest") : t("sendRequest")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
