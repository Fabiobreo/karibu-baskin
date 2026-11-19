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
import {
  MAX_FREE_LABEL,
  MAX_NOTE_TEXT,
  isPlayerPiece,
  type DrillPiece,
  type DrillStep,
} from "@/lib/board/content";
import { RADIUS } from "@/lib/radius";

/** Nome di un pezzo per lo staff: "Ruolo 3, attacco", "Cono", "Tutor". */
export function pieceLabel(piece: DrillPiece): string {
  const side = piece.side === "defense" ? "difesa" : "attacco";
  switch (piece.kind) {
    case "role":
      return `Ruolo ${piece.role}, ${side}`;
    case "free":
      return `Pedina ${piece.label ?? ""}, ${side}`;
    case "coach":
      return piece.coach === "tutor" ? "Tutor" : "Allenatore";
    case "cone":
      return "Cono";
    case "ring":
      return "Cerchio";
    case "chair":
      return "Sedia";
    case "note":
      return `Nota "${piece.label ?? ""}"`;
  }
}

interface DrillSelectionPanelProps {
  pieces: DrillPiece[];
  step: DrillStep;
  stepIndex: number;
  selectedId: string | null;
  screenMode: boolean;
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
  onUpdate,
  onGiveBall,
  onRemoveBall,
  onStartScreen,
  onRemoveScreen,
  onLeave,
  onRemove,
  onBringBack,
}: DrillSelectionPanelProps) {
  const piece = pieces.find((p) => p.id === selectedId) ?? null;
  const offCourt = pieces.filter((p) => !step.at[p.id]);
  const holder = step.ball && "holder" in step.ball ? step.ball.holder : null;
  const hasScreen = !!piece && !!step.screens?.some((s) => s.from === piece.id);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: RADIUS.lg, display: "grid", gap: 2 }}>
      {screenMode ? (
        <Typography variant="body2" role="status">
          Tocca il campo dove arriva il blocco. Esc per annullare.
        </Typography>
      ) : selectedId === "ball" ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle2" component="p" sx={{ flex: "1 1 100%" }}>
            Palla
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ flex: "1 1 100%" }}>
            Trascinala vicino a un giocatore per dargliela, o lasciala dove serve.
          </Typography>
          <Button
            variant="text"
            color="inherit"
            startIcon={<DeleteOutlineIcon />}
            onClick={onRemoveBall}
          >
            Togli la palla da questo passo
          </Button>
        </Box>
      ) : piece ? (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          <Typography variant="subtitle2" component="p">
            {pieceLabel(piece)}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
            {piece.kind === "role" && (
              <TextField
                select
                size="small"
                label="Ruolo"
                value={piece.role}
                onChange={(e) =>
                  onUpdate(piece.id, { role: Number(e.target.value) as DrillPiece["role"] })
                }
                sx={{ width: 120 }}
              >
                {[1, 2, 3, 4, 5].map((r) => (
                  <MenuItem key={r} value={r}>
                    Ruolo {r}
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
                aria-label="Attacco o difesa"
                sx={{ "& .MuiToggleButton-root": { minHeight: 40 } }}
              >
                <ToggleButton value="attack">Attacco</ToggleButton>
                <ToggleButton value="defense">Difesa</ToggleButton>
              </ToggleButtonGroup>
            )}
            {piece.kind === "free" && (
              <TextField
                size="small"
                label="Lettera o numero"
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
                label="Testo della nota"
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
                aria-label="Allenatore o tutor"
                sx={{ "& .MuiToggleButton-root": { minHeight: 40 } }}
              >
                <ToggleButton value="coach">Allenatore</ToggleButton>
                <ToggleButton value="tutor">Tutor</ToggleButton>
              </ToggleButtonGroup>
            )}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {isPlayerPiece(piece) && holder !== piece.id && (
              <Button
                variant="outlined"
                startIcon={<SportsBasketballIcon />}
                onClick={() => onGiveBall(piece.id)}
              >
                Dagli la palla
              </Button>
            )}
            {isPlayerPiece(piece) &&
              (hasScreen ? (
                <Button variant="outlined" onClick={() => onRemoveScreen(piece.id)}>
                  Togli il blocco
                </Button>
              ) : (
                <Button variant="outlined" onClick={onStartScreen}>
                  Blocco
                </Button>
              ))}
            <Button
              variant="text"
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={() => onLeave(piece.id)}
            >
              {stepIndex === 0 ? "Fuori dal campo" : "Esce da questo passo"}
            </Button>
            <Button
              variant="text"
              color="inherit"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => onRemove(piece.id)}
            >
              Elimina da tutti i passi
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Tocca un pezzo per cambiarlo, o trascinalo. Con &ldquo;Aggiungi&rdquo; ne metti uno nuovo.
        </Typography>
      )}

      {offCourt.length > 0 && !screenMode && (
        <Box>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 0.75 }}>
            Fuori dal campo in questo passo: tocca per rimetterlo
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {offCourt.map((p) => (
              <Chip
                key={p.id}
                label={pieceLabel(p)}
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
