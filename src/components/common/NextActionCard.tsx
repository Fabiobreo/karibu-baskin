"use client";
import { Box, Button, Paper, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import PlaceIcon from "@mui/icons-material/Place";
import { useLocale, useTranslations } from "next-intl";
import type { ActionSession, NextAction } from "@/lib/nextAction";
import { trainingLocation } from "@/lib/clubVenue";

interface NextActionCardProps {
  action: NextAction;
  /** Sovrapposta al fondo dell'hero, come la card degli ospiti. */
  overlapHero?: boolean;
}

/**
 * "La tua prossima cosa da fare" (UX-16): una sola azione per i tesserati, in
 * cima alla home e al profilo. Stesso impianto di `GuestOnboardingCard`.
 */
export default function NextActionCard({ action, overlapHero = false }: NextActionCardProps) {
  const t = useTranslations("nextAction");
  const locale = useLocale();
  // Fuso esplicito: la card si renderizza anche sul server (UTC su Vercel) e
  // l'orario deve essere quello della palestra, uguale in idratazione.
  const intl = locale === "en" ? "en-GB" : "it-IT";
  const dayFmt = new Intl.DateTimeFormat(intl, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  });
  const timeFmt = new Intl.DateTimeFormat(intl, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });

  function when(s: ActionSession) {
    const day = dayFmt.format(new Date(s.date));
    const start = timeFmt.format(new Date(s.date));
    const end = s.endTime ? `–${timeFmt.format(new Date(s.endTime))}` : "";
    return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${start}${end}`;
  }

  let icon = <CheckCircleIcon />;
  let title = "";
  let body: string | null = null;
  let session: ActionSession | null = null;
  let cta: { label: string; href: string; primary: boolean } | null = null;

  switch (action.kind) {
    case "availability":
      icon = <EventAvailableIcon />;
      title = t("availabilityTitle", { count: action.count });
      body = t("availabilityBody");
      cta = { label: t("availabilityAction"), href: "/profilo/disponibilita", primary: true };
      break;
    case "register":
      icon = <HowToRegIcon />;
      session = action.session;
      title = action.childName
        ? t("registerTitleChild", { name: action.childName, title: action.session.title })
        : t("registerTitle", { title: action.session.title });
      cta = {
        label: action.childName
          ? t("registerActionChild", { name: action.childName })
          : t("registerAction"),
        href: action.session.href,
        primary: true,
      };
      break;
    case "registered": {
      session = action.session;
      const names = action.names.join(", ");
      title = action.self
        ? action.names.length
          ? t("registeredTitleWith", { title: action.session.title, names })
          : t("registeredTitle", { title: action.session.title })
        : t("registeredTitleOthers", { title: action.session.title, names });
      cta = { label: t("registeredAction"), href: action.session.href, primary: false };
      break;
    }
    case "allSet":
      title = t("allSetTitle");
      body = t("allSetBody");
      cta = { label: t("allSetAction"), href: "/calendario", primary: false };
      break;
  }

  return (
    <Paper
      component="section"
      aria-labelledby="next-action-title"
      elevation={overlapHero ? 8 : 0}
      variant={overlapHero ? "elevation" : "outlined"}
      sx={{
        position: "relative",
        zIndex: 2,
        borderRadius: 3,
        p: { xs: 2.5, md: 3 },
        ...(overlapHero && { mt: { xs: -7, md: -10 } }),
      }}
    >
      <Typography variant="overline" color="text.secondary" component="p">
        {t("overline")}
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5, flex: 1, minWidth: 0 }}>
          <Box
            aria-hidden="true"
            sx={{
              color: action.kind === "allSet" ? "success.main" : "primary.main",
              mt: 0.25,
              display: "flex",
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography id="next-action-title" variant="h6" component="h2" fontWeight={800}>
              {title}
            </Typography>
            {body && (
              <Typography variant="body2" color="text.secondary">
                {body}
              </Typography>
            )}
            {session && (
              <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 0.5, mt: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AccessTimeIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  <Typography variant="body2">{when(session)}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PlaceIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  <Typography variant="body2">{trainingLocation(session.location)}</Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        {cta && (
          <Button
            href={cta.href}
            variant={cta.primary ? "contained" : "outlined"}
            sx={{ minHeight: 44, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {cta.label}
          </Button>
        )}
      </Box>
    </Paper>
  );
}
