"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslations } from "next-intl";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { bibDotSx } from "@/lib/bib";
import type { TrainingDrillItem } from "@/lib/board/trainingDrills";
import {
  trainingPieceNames,
  trainingTeamKeys,
  type TrainingTeamKey,
} from "@/lib/board/trainingNames";
import { fetchJson } from "@/lib/fetchJson";
import { RADIUS } from "@/lib/radius";
import type { TeamsData } from "@/lib/schemas/session";
import { drillPath } from "@/lib/board/category";
import { TOUCH_TARGET_SIZE } from "@/lib/touchTarget";
import DrillPlayer from "./DrillPlayer";
import type { PieceName } from "./BoardSvg";
import { useDrillMeta } from "./BoardLibrary";

interface TrainingDrillsSectionProps {
  sessionId: string;
  teams: TeamsData | null;
  /** Iscrizione → chi guarda ("self") o un suo figlio ("family"). */
  marks: Record<string, "self" | "family">;
  /** La squadra di chi guarda (o del figlio), se c'e'. */
  ownTeam: TrainingTeamKey | null;
  ended: boolean;
}

type Choice = TrainingTeamKey | "roles";

/**
 * "Cosa facciamo oggi" (UX-72): la scaletta dell'allenamento, uno schema per
 * riquadro, con i nomi della squadra scelta sulle pedine. Parte dalla squadra
 * di chi guarda. Solo per i tesserati: chi la monta ha gia' controllato.
 * Senza scaletta non c'e' niente.
 */
export default function TrainingDrillsSection({
  sessionId,
  teams,
  marks,
  ownTeam,
  ended,
}: TrainingDrillsSectionProps) {
  const t = useTranslations("board");
  const meta = useDrillMeta();
  const { teamColorLabel } = useEntityLabels();
  const keys = trainingTeamKeys(teams);
  const [picked, setPicked] = useState<Choice | null>(null);
  const choice: Choice =
    picked ?? (ownTeam && keys.includes(ownTeam) ? ownTeam : (keys[0] ?? "roles"));

  const { data: drills = [] } = useQuery<TrainingDrillItem[]>({
    queryKey: ["training-drills", sessionId],
    queryFn: () => fetchJson(`/api/sessions/${sessionId}/drills`),
  });

  // Calcolo piccolo (pochi schemi, pochi pezzi): niente memo.
  const namesByDrill = (() => {
    const out: Record<string, Record<string, PieceName>> = {};
    for (const d of drills) {
      const names = trainingPieceNames(d.content, {
        teams,
        attack: choice === "roles" ? null : choice,
        assignments: d.assignments,
        seed: `${sessionId}:${d.drillId}`,
        marks,
      });
      out[d.drillId] = Object.fromEntries(
        Object.entries(names).map(([pieceId, n]) => [
          pieceId,
          { name: n.me ? t("you", { name: n.name }) : n.name, highlight: n.me || n.family },
        ])
      );
    }
    return out;
  })();

  if (drills.length === 0) return null;

  return (
    <Paper
      component="section"
      aria-labelledby="lavagna-title"
      id="lavagna"
      elevation={2}
      sx={{ p: { xs: 2, sm: 3 } }}
    >
      <Typography id="lavagna-title" variant="h4" component="h2" sx={{ mb: 2 }}>
        {ended ? t("trainingTitlePast") : t("trainingTitle")}
      </Typography>

      {keys.length > 0 ? (
        <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" color="text.secondary" component="span" id="lavagna-team">
            {t("withTeam")}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={choice}
            onChange={(_, v: Choice | null) => v && setPicked(v)}
            aria-labelledby="lavagna-team"
            sx={{
              flexWrap: "wrap",
              "& .MuiToggleButton-root": {
                minHeight: TOUCH_TARGET_SIZE,
                color: "text.secondary",
                gap: 0.75,
              },
              "& .MuiToggleButton-root.Mui-selected": { color: "text.primary" },
            }}
          >
            {keys.map((k) => (
              <ToggleButton key={k} value={k}>
                <Box
                  component="span"
                  aria-hidden
                  sx={[{ width: 12, height: 12, borderRadius: "50%" }, bibDotSx(k)]}
                />
                {teamColorLabel(k)}
              </ToggleButton>
            ))}
            <ToggleButton value="roles">{t("onlyRoles")}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("noTeamsYet")}
        </Typography>
      )}

      <Box sx={{ display: "grid", gap: 1.5 }}>
        {drills.map((d, i) => (
          <Accordion
            key={d.drillId}
            defaultExpanded={i === 0}
            disableGutters
            variant="outlined"
            slotProps={{ transition: { unmountOnExit: true } }}
            sx={{ borderRadius: `${RADIUS.lg} !important`, "&::before": { display: "none" } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: TOUCH_TARGET_SIZE }}>
              <Box>
                <Typography variant="h6" component="h3">
                  {d.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {meta(d)}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {d.note && (
                <Typography variant="body2" sx={{ mb: 1.5, fontStyle: "italic" }}>
                  {d.note}
                </Typography>
              )}
              <DrillPlayer
                title={d.title}
                court={d.court}
                content={d.content}
                names={namesByDrill[d.drillId]}
              />
              <Button href={drillPath(d.slug)} variant="text" sx={{ mt: 1 }}>
                {t("openOnBoard")}
              </Button>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Paper>
  );
}
