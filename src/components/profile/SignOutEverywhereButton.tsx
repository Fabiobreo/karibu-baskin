"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { readError } from "@/lib/fetchJson";
import { purgeServiceWorkerCaches } from "@/lib/swCachePurge";

/**
 * "Esci da tutti i dispositivi" (KB-16).
 *
 * Cancella tutte le sessioni dell'utente sul server, poi chiude anche quella
 * corrente nel browser e svuota la cache locale, come un logout normale.
 */
export default function SignOutEverywhereButton() {
  const t = useTranslations("profile");
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);

  const signOutAll = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/me/sessions", { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
    },
    onSuccess: async () => {
      await purgeServiceWorkerCaches();
      await signOut({ callbackUrl: "/" });
    },
    onError: () => showToast({ message: t("signOutEverywhereError"), severity: "error" }),
  });

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={() => setOpen(true)}
        sx={{ fontSize: "0.78rem" }}
      >
        {t("signOutEverywhere")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("signOutEverywhereTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("signOutEverywhereConfirm")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={signOutAll.isPending}>
            {t("signOutEverywhereCancel")}
          </Button>
          <Button
            variant="contained"
            onClick={() => signOutAll.mutate()}
            disabled={signOutAll.isPending}
          >
            {t("signOutEverywhere")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
