"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { readError } from "@/lib/fetchJson";
import { purgeServiceWorkerCaches } from "@/lib/swCachePurge";

interface MissingNameDialogProps {
  /** Email con cui è entrato: lo aiuta a capire con quale account sta entrando. */
  email: string | null;
}

/**
 * "Come ti chiami?" al primo accesso di chi non ha un nome, cioè chi entra col
 * magic link: Auth.js conosce solo l'email. Senza nome non ci si può iscrivere
 * agli allenamenti e lo staff vede solo un indirizzo.
 *
 * Montato dal layout radice, e non come pagina a cui reindirizzare: compare su
 * qualunque pagina la persona arrivi (link dell'email, segnalibro, notifica)
 * senza redirect da gestire. Non si chiude senza nome; per chi è entrato con
 * l'account sbagliato c'è "Esci".
 */
export default function MissingNameDialog({ email }: MissingNameDialogProps) {
  const t = useTranslations("missingName");
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);

  const first = firstName.trim();
  const last = lastName.trim();
  const valid = first.length > 0 && last.length > 0 && `${first} ${last}`.length >= 2;

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${first} ${last}` }),
      });
      if (!res.ok) throw new Error(await readError(res));
    },
    onSuccess: () => {
      setDone(true);
      // Il layout rilegge la sessione: saluto in home, header e iscrizioni
      // vedono subito il nome.
      router.refresh();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (valid) save.mutate();
  }

  async function handleSignOut() {
    await purgeServiceWorkerCaches();
    await signOut({ callbackUrl: "/" });
  }

  return (
    <ResponsiveDialog
      open={!done}
      // Niente chiusura con Esc o clic fuori: senza nome l'account non funziona.
      onClose={() => {}}
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
      aria-labelledby="missing-name-title"
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle id="missing-name-title" sx={{ fontWeight: 800, pb: 1 }}>
          {t("title")}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            {t("body")}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label={t("firstName")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              autoFocus
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 30 } }}
              error={touched && !first}
              helperText={touched && !first ? t("firstNameRequired") : undefined}
            />
            <TextField
              label={t("lastName")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 29 } }}
              error={touched && !last}
              helperText={touched && !last ? t("lastNameRequired") : undefined}
            />
          </Stack>
          {save.isError && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }} role="alert">
              {save.error instanceof Error ? save.error.message : t("saveError")}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2.5 }}>
            {email ? t("signedInAs", { email }) : null}{" "}
            <Box
              component="button"
              type="button"
              onClick={handleSignOut}
              sx={{
                p: 0,
                border: 0,
                bgcolor: "transparent",
                color: "primary.onLight",
                font: "inherit",
                fontWeight: 600,
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              {t("notYou")}
            </Box>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {t("privacyPrefix")}{" "}
            {/* In una nuova scheda: il dialog non si chiude e coprirebbe la pagina. */}
            <Link href="/privacy" target="_blank" rel="noopener" style={{ color: "inherit" }}>
              {t("privacyLink")}
            </Link>
            .
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={save.isPending}
            startIcon={save.isPending ? <CircularProgress size={16} /> : undefined}
          >
            {t("submit")}
          </Button>
        </DialogActions>
      </Box>
    </ResponsiveDialog>
  );
}
