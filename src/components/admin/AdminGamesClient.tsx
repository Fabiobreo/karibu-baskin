"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import type { GameVisibility } from "@prisma/client";
import { useToast } from "@/context/ToastContext";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { readError } from "@/lib/fetchJson";
import {
  GAME_KEYS,
  GAME_RULES,
  GAME_VISIBILITY_LABELS,
  type GameKey,
  type GameSettings,
} from "@/lib/games/gameSettings";
import { RADIUS } from "@/lib/radius";

/** Nome, spiegazione e pagina di ogni gioco nel pannello (solo italiano). */
const GAME_INFO: Record<GameKey, { name: string; description: string; href: string }> = {
  quiz: {
    name: "Quiz",
    description:
      "Si accendono uno per uno, ognuno con le sue domande: per tutti, solo per i tesserati o spento.",
    href: "/admin/giochi/quiz",
  },
  prediction: {
    name: "Pronostico della partita",
    description:
      "Chi vince la prossima partita: apre 3 giorni prima, nella pagina della partita. Serve un account per salvarlo, quindi non è mai per tutti. Spento, i pronostici salvati restano.",
    href: "/giochi",
  },
  simulator: {
    name: "Sfida fra le nostre squadre",
    description:
      "Due formazioni con le rose vere, minori compresi: solo per i tesserati, mai per tutti.",
    href: "/giochi/sfida",
  },
};

interface AdminGamesClientProps {
  initialSettings: GameSettings;
  /** Una riga di numeri per gioco, già scritta dal server (solo per curiosità). */
  numbers: Partial<Record<GameKey, string>>;
}

/** I quiz hanno lo stato ciascuno (UX-67): qui solo il rimando al loro elenco. */
const SWITCHED_GAMES = GAME_KEYS.filter((g) => g !== "quiz");

/**
 * Pannello dei giochi (UX-66), solo admin: per ogni gioco chi lo vede, entro
 * gli stati che quel gioco ammette. Un gioco spento lo provano comunque
 * allenatori e admin, in anteprima.
 */
export default function AdminGamesClient({ initialSettings, numbers }: AdminGamesClientProps) {
  const [settings, setSettings] = useState(initialSettings);
  const { showToast } = useToast();
  const { openConfirm, ConfirmDialog } = useConfirmDialog();

  const save = useMutation({
    mutationFn: async ({ game, visibility }: { game: GameKey; visibility: GameVisibility }) => {
      const res = await fetch(`/api/admin/games/${game}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return { game, visibility };
    },
    onSuccess: ({ game, visibility }) => {
      setSettings((prev) => ({ ...prev, [game]: visibility }));
      showToast({
        message: `${GAME_INFO[game].name}: ${GAME_VISIBILITY_LABELS[visibility].toLowerCase()}`,
        severity: "success",
      });
    },
    onError: (err) => showToast({ message: err.message, severity: "error" }),
  });

  function change(game: GameKey, visibility: GameVisibility) {
    if (visibility === settings[game]) return;
    if (visibility === "PUBLIC") {
      openConfirm(
        `${GAME_INFO[game].name} per tutti?`,
        "Lo potrà giocare anche chi non ha un account, e la pagina comparirà nel menu e su Google.",
        () => save.mutate({ game, visibility }),
        { confirmLabel: "Apri a tutti", confirmColor: "primary" }
      );
      return;
    }
    save.mutate({ game, visibility });
  }

  return (
    <Stack spacing={2}>
      <Paper
        component="section"
        aria-labelledby="game-quiz-label"
        variant="outlined"
        sx={{ p: { xs: 2, md: 2.5 }, borderRadius: RADIUS.lg }}
      >
        <Typography id="game-quiz-label" variant="h6" component="h2">
          {GAME_INFO.quiz.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
          {GAME_INFO.quiz.description}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {numbers.quiz ?? ""}
          </Typography>
          <Button href={GAME_INFO.quiz.href} variant="outlined" sx={{ minHeight: 44 }}>
            Quiz e domande
          </Button>
        </Box>
      </Paper>
      {SWITCHED_GAMES.map((game) => {
        const info = GAME_INFO[game];
        const labelId = `game-${game}-label`;
        return (
          <Paper
            key={game}
            component="section"
            aria-labelledby={labelId}
            variant="outlined"
            sx={{ p: { xs: 2, md: 2.5 }, borderRadius: RADIUS.lg }}
          >
            <Typography id={labelId} variant="h6" component="h2">
              {info.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
              {info.description}
            </Typography>
            <FormControl disabled={save.isPending}>
              <FormLabel id={`game-${game}-state`} sx={{ typography: "body2" }}>
                Chi lo vede
              </FormLabel>
              <RadioGroup
                row
                aria-labelledby={`game-${game}-state`}
                value={settings[game]}
                onChange={(e) => change(game, e.target.value as GameVisibility)}
              >
                {GAME_RULES[game].allowed.map((v) => (
                  <FormControlLabel
                    key={v}
                    value={v}
                    control={<Radio />}
                    label={GAME_VISIBILITY_LABELS[v]}
                    sx={{ minHeight: 44, mr: 3 }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
                mt: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {numbers[game] ?? ""}
              </Typography>
              <Button href={info.href} variant="text" size="small" sx={{ minHeight: 44 }}>
                {settings[game] === "OFF" ? "Prova in anteprima" : "Apri il gioco"}
              </Button>
            </Box>
          </Paper>
        );
      })}
      {ConfirmDialog}
    </Stack>
  );
}
