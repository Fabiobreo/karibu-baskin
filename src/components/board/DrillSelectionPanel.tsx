"use client";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import { useTranslations } from "next-intl";
import {
  MAX_FREE_LABEL,
  MAX_NOTE_TEXT,
  isPlayerPiece,
  type DrillPiece,
  type DrillStep,
} from "@/lib/board/content";
import { RADIUS } from "@/lib/radius";

type EditorT = ReturnType<typeof useTranslations<"board.editor">>;

/** Nome di un pezzo: "Ruolo 3, attacco", "Cono", "Tutor". */
export function pieceLabel(piece: DrillPiece, t: EditorT): string {
  const side = piece.side === "defense" ? t("sideDefense") : t("sideAttack");
  switch (piece.kind) {
    case "role":
      return t("pieceRole", { n: piece.role ?? 1, side });
    case "free":
      return t("pieceFree", { label: piece.label ?? "", side });
    case "coach":
      return piece.coach === "tutor" ? t("tutor") : t("coach");
    case "cone":
      return t("cone");
    case "ring":
      return t("ring");
    case "chair":
      return t("chair");
    case "note":
      return t("pieceNote", { label: piece.label ?? "" });
  }
}

interface DrillSelectionPanelProps {
  pieces: DrillPiece[];
  step: DrillStep;
  stepIndex: number;
  selectedId: string | null;
  screenMode: boolean;
  /** Il percorso con cui arriva in questo passo (UX-73): `null` se non si sposta. */
  path: "straight" | "curved" | null;
  onStraighten: () => void;
  onUpdate: (id: string, patch: Partial<Omit<DrillPiece, "id" | "kind">>) => void;
  onGiveBall: (id: string) => void;
  onRemoveBall: () => void;
  onStartScreen: () => void;
  onRemoveScreen: (id: string) => void;
  onLeave: (id: string) => void;
  onRemove: (id: string) => void;
  onBringBack: (id: string) => void;
}

/**
 * Sotto la lavagna, le proprieta' di quello che si e' toccato (UX-72): ruolo,
 * lato, scritta, la palla, il blocco, uscire dal campo, eliminare. In fondo i
 * pezzi fuori dal campo in questo passo, da rimettere con un tocco.
 */
export default function DrillSelectionPanel({
  pieces,
  step,
  stepIndex,
  selectedId,
  screenMode,
  path,
  onStraighten,
  onUpdate,
  onGiveBall,
  onRemoveBall,
  onStartScreen,
  onRemoveScreen,
  onLeave,
  onRemove,
  onBringBack,
}: DrillSelectionPanelProps) {
  const t = useTranslations("board.editor");
  const piece = pieces.find((p) => p.id === selectedId) ?? null;
  const offCourt = pieces.filter((p) => !step.at[p.id]);
  const holder = step.ball && "holder" in step.ball ? step.ball.holder : null;
  const hasScreen = !!piece && !!step.screens?.some((s) => s.from === piece.id);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: RADIUS.lg, display: "grid", gap: 2 }}>
      {screenMode ? (
        <Typography variant="body2" role="status">
          {t("screenHint")}
        </Typography>
      ) : selectedId === "ball" ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle2" component="p" sx={{ flex: "1 1 100%" }}>
            {t("ball")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ flex: "1 1 100%" }}>
            {t("ballHint")}
          </Typography>
          {path && <PathHint path={path} onStraighten={onStraighten} />}
          <Button
            variant="text"
            color="inherit"
            startIcon={<DeleteOutlineIcon />}
            onClick={onRemoveBall}
          >
            {t("removeBallStep")}
          </Button>
        </Box>
      ) : piece ? (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          <Typography variant="subtitle2" component="p">
            {pieceLabel(piece, t)}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
            {piece.kind === "role" && (
              <TextField
                select
                size="small"
                label={t("roleLabel")}
                value={piece.role}
                onChange={(e) =>
                  onUpdate(piece.id, { role: Number(e.target.value) as DrillPiece["role"] })
                }
                sx={{ width: 120 }}
              >
                {[1, 2, 3, 4, 5].map((r) => (
                  <MenuItem key={r} value={r}>
                    {t("role", { n: r })}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {(piece.kind === "role" || piece.kind === "free") && (
              <ToggleButtonGroup
                exclusive
                size="small"
                value={piece.side}
                onChange={(_, v) => v && onUpdate(piece.id, { side: v })}
                aria-label={t("sideLabel")}
                sx={{ "& .MuiToggleButton-root": { minHeight: 40 } }}
              >
                <ToggleButton value="attack">{t("attack")}</ToggleButton>
                <ToggleButton value="defense">{t("defense")}</ToggleButton>
              </ToggleButtonGroup>
            )}
            {piece.kind === "free" && (
              <TextField
                size="small"
                label={t("freeLabel")}
                value={piece.label ?? ""}
                onChange={(e) =>
                  onUpdate(piece.id, {
                    label: e.target.value.slice(0, MAX_FREE_LABEL).toUpperCase(),
                  })
                }
                sx={{ width: 150 }}
              />
            )}
            {piece.kind === "note" && (
              <TextField
                size="small"
                label={t("noteLabel")}
                value={piece.label ?? ""}
                onChange={(e) =>
                  onUpdate(piece.id, { label: e.target.value.slice(0, MAX_NOTE_TEXT) })
                }
                helperText={`${(piece.label ?? "").length}/${MAX_NOTE_TEXT}`}
                sx={{ flex: "1 1 240px" }}
              />
            )}
            {piece.kind === "coach" && (
              <ToggleButtonGroup
                exclusive
                size="small"
                value={piece.coach}
                onChange={(_, v) => v && onUpdate(piece.id, { coach: v })}
                aria-label={t("coachLabel")}
                sx={{ "& .MuiToggleButton-root": { minHeight: 40 } }}
              >
                <ToggleButton value="coach">{t("coach")}</ToggleButton>
                <ToggleButton value="tutor">{t("tutor")}</ToggleButton>
              </ToggleButtonGroup>
            )}
          </Box>
          {path && <PathHint path={path} onStraighten={onStraighten} />}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {isPlayerPiece(piece) && holder !== piece.id && (
              <Button
                variant="outlined"
                startIcon={<SportsBasketballIcon />}
                onClick={() => onGiveBall(piece.id)}
              >
                {t("giveBall")}
              </Button>
            )}
            {isPlayerPiece(piece) &&
              (hasScreen ? (
                <Button variant="outlined" onClick={() => onRemoveScreen(piece.id)}>
                  {t("removeScreen")}
                </Button>
              ) : (
                <Button variant="outlined" onClick={onStartScreen}>
                  {t("screen")}
                </Button>
              ))}
            <Button
              variant="text"
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={() => onLeave(piece.id)}
            >
              {stepIndex === 0 ? t("offCourt") : t("leaveStep")}
            </Button>
            <Button
              variant="text"
              color="inherit"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => onRemove(piece.id)}
            >
              {t("removeEverywhere")}
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t("selectHint")}
        </Typography>
      )}

      {offCourt.length > 0 && !screenMode && (
        <Box>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 0.75 }}>
            {t("offCourtList")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {offCourt.map((p) => (
              <Chip
                key={p.id}
                label={pieceLabel(p, t)}
                onClick={() => onBringBack(p.id)}
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}

/** Come si curva il percorso, e il bottone per raddrizzarlo (UX-73). */
function PathHint({
  path,
  onStraighten,
}: {
  path: "straight" | "curved";
  onStraighten: () => void;
}) {
  const t = useTranslations("board.editor");
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, flex: "1 1 100%" }}>
      <Typography variant="body2" color="text.secondary" sx={{ flex: "1 1 200px" }}>
        {t("curveHint")}
      </Typography>
      {path === "curved" && (
        <Button variant="outlined" onClick={onStraighten}>
          {t("straighten")}
        </Button>
      )}
    </Box>
  );
}
