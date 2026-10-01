"use client";
import { useState, type ReactNode } from "react";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import Link from "next/link";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import TeamsModal from "@/components/training/TeamsModal";
import type { SessionWithCount } from "@/components/training/SessionCard";
import { TYPE_SCALE } from "@/lib/typeScale";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { TEAM_META, bibFill } from "@/lib/constants";

interface TrainingListRowProps {
  session: SessionWithCount;
  /** Pezzi della riga sotto il titolo (orario, iscritti, risultato…), separati da "·". */
  meta: ReactNode[];
  /** Stato a destra: iscrizione per i prossimi, presenza per i passati. */
  trailing?: ReactNode;
  isStaff?: boolean;
}

/**
 * Riga della lista di /allenamenti. Tutta la riga porta all'allenamento (link
 * esteso); sopra il link restano solo i controlli veri: squadre e, per lo
 * staff, la gestione in admin.
 */
export default function TrainingListRow({
  session: s,
  meta,
  trailing,
  isStaff = false,
}: TrainingListRowProps) {
  const t = useTranslations("trainings");
  const dateLocale = useActiveDateLocale();
  const [teamsOpen, setTeamsOpen] = useState(false);
  const date = new Date(s.date);
  const href = `/allenamento/${s.dateSlug ?? s.id}`;

  return (
    <>
      <Box
        sx={{
          position: "relative",
          // Griglia: su schermi stretti lo stato scende sotto i dettagli, cosi'
          // il titolo non viene tagliato a meta'.
          display: "grid",
          gridTemplateColumns: {
            xs: "auto minmax(0, 1fr) auto",
            sm: "auto minmax(0, 1fr) auto auto",
          },
          gridTemplateAreas: {
            xs: '"date text actions" "date status actions"',
            sm: '"date text status actions"',
          },
          alignItems: "center",
          columnGap: { xs: 1.5, sm: 2 },
          px: { xs: 1.5, sm: 2 },
          py: 1.5,
          // Si tocca: al passaggio una fascia arancio a sinistra, oltre al fondo.
          borderLeft: "3px solid transparent",
          "&:hover": { bgcolor: "action.hover", borderLeftColor: "primary.main" },
          transition: "background-color 0.15s, border-color 0.15s",
          // L'ingranaggio dello staff si vede al passaggio del mouse; sui
          // dispositivi touch, che il passaggio non ce l'hanno, resta visibile.
          "@media (hover: hover)": {
            "& .row-staff": { opacity: 0 },
            "&:hover .row-staff, &:focus-within .row-staff": { opacity: 1 },
          },
        }}
      >
        <Box
          component={Link}
          href={href}
          aria-label={s.title}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: "-2px",
            },
          }}
        />

        {/* Tessera data */}
        <Box
          aria-hidden
          sx={{ gridArea: "date", width: 44, textAlign: "center", pointerEvents: "none" }}
        >
          <Typography
            variant="caption"
            sx={{ display: "block", color: "text.secondary", lineHeight: 1.1 }}
          >
            {format(date, "EEE", { locale: dateLocale })}
          </Typography>
          <Typography
            fontWeight={FONT_WEIGHT.bold}
            sx={{ lineHeight: 1.1, fontSize: TYPE_SCALE.xl }}
          >
            {format(date, "d")}
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: "block", color: "text.secondary", lineHeight: 1.1 }}
          >
            {format(date, "MMM", { locale: dateLocale })}
          </Typography>
        </Box>

        <Box sx={{ gridArea: "text", minWidth: 0, pointerEvents: "none" }}>
          <Typography
            variant="body1"
            fontWeight={FONT_WEIGHT.semibold}
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {s.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {meta.map((part, i) => (
              <Box component="span" key={i}>
                {i > 0 && " · "}
                {part}
              </Box>
            ))}
          </Typography>
        </Box>

        {trailing && (
          <Box
            sx={{
              gridArea: "status",
              justifySelf: { xs: "start", sm: "end" },
              mt: { xs: 0.75, sm: 0 },
              pointerEvents: "none",
            }}
          >
            {trailing}
          </Box>
        )}

        <Box
          sx={{
            gridArea: "actions",
            display: "flex",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {s.teams && (
            // Con l'etichetta da `sm` (UX-43): il pallone da solo non diceva
            // che cosa apre. Su telefono, dove non c'e' spazio, resta l'icona.
            <Button
              size="small"
              variant="text"
              color="inherit"
              aria-label={t("viewTeamsBtn")}
              onClick={() => setTeamsOpen(true)}
              sx={{
                minWidth: 40,
                minHeight: 40,
                color: "text.primary",
                gap: 0.75,
              }}
            >
              {/* Le casacche delle squadre fatte: colori veri delle maglie,
                accanto alla parola "Squadre". */}
              <Box aria-hidden sx={{ display: "flex", gap: "3px" }}>
                {TEAM_META.filter((m) => s.teams?.[m.key]).map((m) => (
                  <Box
                    key={m.key}
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: bibFill(m.color),
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                ))}
              </Box>
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {t("rowTeams")}
              </Box>
            </Button>
          )}
          {/* Lo staff gestisce iscrizioni, squadre e modifiche dall'admin (UX-14). */}
          {isStaff && (
            <Tooltip title="Gestisci in admin">
              <IconButton
                className="row-staff"
                href={`/admin/allenamenti?apri=${s.id}`}
                aria-label={`Gestisci ${s.title} in admin`}
                sx={{ color: "text.secondary", mr: -0.5, transition: "opacity 0.15s" }}
              >
                <SettingsIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {s.teams && (
        <TeamsModal
          open={teamsOpen}
          onClose={() => setTeamsOpen(false)}
          sessionTitle={s.title}
          sessionDate={s.date}
          sessionEndTime={s.endTime}
          teamA={s.teams.teamA}
          teamB={s.teams.teamB}
          teamC={s.teams.teamC}
          coaches={s.teams.coaches}
        />
      )}
    </>
  );
}
