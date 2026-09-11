"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ReplayIcon from "@mui/icons-material/Replay";
import { useTranslations } from "next-intl";
import SportRoleQuestionnaire, {
  type SportRoleResult,
} from "@/components/training/SportRoleQuestionnaire";
import { ROLE_COLORS } from "@/lib/constants";
import { readError } from "@/lib/fetchJson";
import { useToast } from "@/context/ToastContext";
import type { RoleInfo } from "@/lib/content/baskinInfo";

interface RoleQuizClientProps {
  /** Ruolo confermato dallo staff: se c'è, niente questionario. */
  confirmed: SportRoleResult | null;
  /** Ultimo ruolo suggerito salvato (questionario o iscrizione). */
  suggested: SportRoleResult | null;
  rolesInfo: RoleInfo[];
  /** Il prossimo allenamento: quello a cui è già iscritto o, se no, uno aperto. */
  nextSession: { href: string; registered: boolean } | null;
}

/**
 * Questionario del ruolo Baskin fuori dagli allenamenti: chi arriva scopre il
 * proprio ruolo subito, e il risultato resta salvato come suggerimento per lo
 * staff e per il form d'iscrizione, che non lo richiede più.
 */
export default function RoleQuizClient({
  confirmed,
  suggested: initialSuggested,
  rolesInfo,
  nextSession,
}: RoleQuizClientProps) {
  const t = useTranslations("roleQuiz");
  const router = useRouter();
  const { showToast } = useToast();
  const [suggested, setSuggested] = useState(initialSuggested);
  const [redoing, setRedoing] = useState(!initialSuggested);

  const save = useMutation({
    mutationFn: async (result: SportRoleResult) => {
      const res = await fetch("/api/users/me/sport-role-suggestion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: result.role, variant: result.variant ?? null }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return result;
    },
    onSuccess: (result) => {
      setSuggested(result);
      setRedoing(false);
      // La home e il profilo leggono il suggerimento lato server.
      router.refresh();
    },
    onError: (err) =>
      showToast({
        message: err instanceof Error ? err.message : t("saveError"),
        severity: "error",
      }),
  });

  if (confirmed) {
    return <RoleResultCard result={confirmed} rolesInfo={rolesInfo} kind="confirmed" />;
  }

  if (save.isPending) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (redoing || !suggested) {
    return (
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 } }}>
        <SportRoleQuestionnaire
          onResult={(result) => save.mutate(result)}
          initialSuggested={suggested ?? undefined}
        />
        {suggested && (
          <Button
            size="small"
            onClick={() => setRedoing(false)}
            sx={{ mt: 1, color: "text.secondary" }}
          >
            {t("cancelRedo")}
          </Button>
        )}
      </Paper>
    );
  }

  return (
    <RoleResultCard result={suggested} rolesInfo={rolesInfo} kind="suggested">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
        <Link href={nextSession?.href ?? "/allenamenti"} style={{ textDecoration: "none" }}>
          <Button variant="contained" startIcon={<EventAvailableIcon />} fullWidth>
            {nextSession
              ? nextSession.registered
                ? t("ctaBooked")
                : t("ctaNextSession")
              : t("ctaSessions")}
          </Button>
        </Link>
        <Button variant="outlined" startIcon={<ReplayIcon />} onClick={() => setRedoing(true)}>
          {t("redo")}
        </Button>
      </Stack>
    </RoleResultCard>
  );
}

interface RoleResultCardProps {
  result: SportRoleResult;
  rolesInfo: RoleInfo[];
  kind: "suggested" | "confirmed";
  children?: React.ReactNode;
}

function RoleResultCard({ result, rolesInfo, kind, children }: RoleResultCardProps) {
  const t = useTranslations("roleQuiz");
  const tRoles = useTranslations("roles");
  const info = rolesInfo.find((r) => r.role === result.role);
  // "Ruolo 3: Il Protagonista" → "Il Protagonista": il numero è già nel chip.
  const roleName = info ? info.label.split(": ").slice(1).join(": ") || info.tag : null;
  const color = ROLE_COLORS[result.role];

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2.5, md: 4 }, borderTop: "4px solid", borderTopColor: color }}
    >
      <Typography
        variant="overline"
        color="text.secondary"
        fontWeight={700}
        sx={{ letterSpacing: "0.1em" }}
      >
        {kind === "confirmed" ? t("confirmedOverline") : t("suggestedOverline")}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}>
        <Chip
          label={tRoles("sportRole", { n: result.role, v: result.variant ?? "" })}
          sx={{ bgcolor: color, color: "common.white", fontWeight: 800, fontSize: "0.9rem" }}
        />
        {roleName && (
          <Typography variant="h5" component="h2" fontWeight={800}>
            {roleName}
          </Typography>
        )}
      </Box>
      {result.variant && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {tRoles(`variant${result.variant}`)}
        </Typography>
      )}
      {info && (
        <Typography variant="body1" sx={{ mt: 2, lineHeight: 1.7 }}>
          {info.description}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {kind === "confirmed" ? t("confirmedNote") : t("suggestedNote")}
      </Typography>
      {children}
      <Box sx={{ mt: 2.5 }}>
        <Link href="/il-baskin" style={{ color: "inherit" }}>
          <Typography variant="body2" component="span" color="primary.onLight" fontWeight={600}>
            {t("allRoles")}
          </Typography>
        </Link>
      </Box>
    </Paper>
  );
}
