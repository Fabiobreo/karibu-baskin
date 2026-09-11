"use client";
import Link from "next/link";
import { Box, Button, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { useLocale, useTranslations } from "next-intl";
import type { GuestOnboarding, OnboardingStep } from "@/lib/guestOnboarding";

interface GuestOnboardingCardProps {
  data: GuestOnboarding;
  /** In home la card si sovrappone al bordo basso della hero. */
  overlapHero?: boolean;
}

/**
 * "I tuoi primi passi": la prima cosa che vede chi aspetta la conferma dello
 * staff. Sostituisce il vecchio avviso "account in revisione": l'attesa diventa
 * uno dei passi di un percorso, e gli altri si possono fare subito.
 */
export default function GuestOnboardingCard({
  data,
  overlapHero = false,
}: GuestOnboardingCardProps) {
  const t = useTranslations("guestOnboarding");
  const tRoles = useTranslations("roles");
  const locale = useLocale();
  // Fuso esplicito: la card si renderizza anche sul server (UTC su Vercel) e
  // l'orario deve essere quello della palestra, uguale in idratazione.
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
  const fmt = (d: Date | string) => dateFmt.format(new Date(d));

  const total = data.steps.length;
  const firstTodoId = data.steps.find((s) => s.status === "todo")?.id;
  const roleLabel = data.role
    ? tRoles("sportRole", { n: data.role.role, v: data.role.variant ?? "" })
    : "";

  function stepContent(step: OnboardingStep): {
    title: string;
    body: string;
    action?: { label: string; href: string; primary: boolean };
  } {
    switch (step.id) {
      case "account":
        return { title: t("accountTitle"), body: t("accountBody") };
      case "role":
        return step.status === "done"
          ? {
              title: t("roleDoneTitle", { role: roleLabel }),
              body: data.roleConfirmed ? t("roleConfirmedBody") : t("roleSuggestedBody"),
              action: data.roleConfirmed
                ? undefined
                : { label: t("roleReview"), href: "/profilo/ruolo", primary: false },
            }
          : {
              title: t("roleTitle"),
              body: t("roleBody"),
              action: { label: t("roleStart"), href: "/profilo/ruolo", primary: true },
            };
      case "training":
        if (step.status === "done") {
          return data.registeredSession
            ? {
                title: t("trainingBookedTitle", { date: fmt(data.registeredSession.date) }),
                body: t("trainingBookedBody"),
                action: {
                  label: t("trainingOpen"),
                  href: data.registeredSession.href,
                  primary: false,
                },
              }
            : {
                title: t("trainingDoneTitle"),
                body: t("trainingDoneBody"),
                action: { label: t("trainingAll"), href: "/allenamenti", primary: false },
              };
        }
        return data.nextSession
          ? {
              title: t("trainingTitle"),
              body: t("trainingNextBody", { date: fmt(data.nextSession.date) }),
              action: { label: t("trainingSignUp"), href: data.nextSession.href, primary: true },
            }
          : {
              title: t("trainingTitle"),
              body: t("trainingNoneBody"),
              action: { label: t("trainingAll"), href: "/allenamenti", primary: false },
            };
      case "approval":
        return { title: t("approvalTitle"), body: t("approvalBody") };
    }
  }

  return (
    <Paper
      component="section"
      aria-labelledby="guest-onboarding-title"
      elevation={overlapHero ? 8 : 0}
      variant={overlapHero ? "elevation" : "outlined"}
      sx={{
        position: "relative",
        zIndex: 2,
        borderRadius: 3,
        p: { xs: 2.5, md: 3.5 },
        ...(overlapHero && { mt: { xs: -7, md: -10 } }),
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 2,
          mb: 1.5,
        }}
      >
        <Box>
          <Typography
            variant="overline"
            color="primary.onLight"
            fontWeight={700}
            sx={{ letterSpacing: "0.1em", lineHeight: 1.5 }}
          >
            {t("overline")}
          </Typography>
          <Typography
            id="guest-onboarding-title"
            variant="h5"
            component="h2"
            fontWeight={800}
            sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" } }}
          >
            {t("title")}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ flexShrink: 0 }}>
          {t("progress", { done: data.doneCount, total })}
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={(data.doneCount / total) * 100}
        aria-label={t("progress", { done: data.doneCount, total })}
        sx={{ height: 6, borderRadius: 3, mb: 2.5, bgcolor: "action.hover" }}
      />

      <Stack component="ol" spacing={0} sx={{ listStyle: "none", m: 0, p: 0 }}>
        {data.steps.map((step, i) => {
          const c = stepContent(step);
          // Un solo pulsante pieno, sul primo passo da fare: due inviti uguali
          // si fanno concorrenza. Gli altri passi da fare restano contornati.
          const isNext = step.id === firstTodoId;
          const isDone = step.status === "done";
          const isWaiting = step.status === "waiting";
          return (
            <Box
              component="li"
              key={step.id}
              sx={{
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: 1, sm: 2 },
                py: 1.75,
                borderTop: i === 0 ? "none" : "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", gap: 1.5, flex: 1, minWidth: 0 }}>
                <Box
                  sx={(theme) => ({
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: isDone
                      ? alpha(theme.palette.success.main, 0.12)
                      : isWaiting
                        ? alpha(theme.palette.warning.main, 0.12)
                        : alpha(theme.palette.primary.main, 0.1),
                    color: isDone ? "success.main" : isWaiting ? "warning.main" : "primary.main",
                  })}
                  aria-hidden
                >
                  {isDone ? (
                    <CheckCircleIcon fontSize="small" />
                  ) : isWaiting ? (
                    <ScheduleIcon fontSize="small" />
                  ) : (
                    <RadioButtonUncheckedIcon fontSize="small" />
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    sx={{ color: isDone ? "text.secondary" : "text.primary" }}
                  >
                    <Box component="span" sx={visuallyHidden}>
                      {t(`status_${step.status}`)}:{" "}
                    </Box>
                    {c.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.body}
                  </Typography>
                </Box>
              </Box>
              {c.action && (
                // Da mobile il pulsante va a capo, allineato al testo e non all'icona.
                <Box sx={{ flexShrink: 0, ml: { xs: "44px", sm: 0 } }}>
                  <Link href={c.action.href} style={{ textDecoration: "none" }}>
                    <Button
                      variant={c.action.primary ? (isNext ? "contained" : "outlined") : "text"}
                      size="small"
                      sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      {c.action.label}
                    </Button>
                  </Link>
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}

const visuallyHidden = {
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  border: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
} as const;
