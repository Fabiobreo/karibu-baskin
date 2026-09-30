"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import { useQuery } from "@tanstack/react-query";
import InlineError from "@/components/common/InlineError";
import RoleBadge from "@/components/common/RoleBadge";
import { ROLES } from "@/lib/constants";
import { readError } from "@/lib/fetchJson";
import type { EventResponses, ResponseRow } from "@/lib/eventResponses";
import { FONT_WEIGHT } from "@/lib/fontWeight";

interface EventResponsesDialogProps {
  eventId: string | null;
  onClose: () => void;
}

type ResponsesPayload = EventResponses & { title: string };

const STATUS_META: Record<
  ResponseRow["status"],
  { label: string; color: "success" | "warning" | "default" }
> = {
  GOING: { label: "Ci sarò", color: "success" },
  MAYBE: { label: "Forse", color: "warning" },
  NOT_GOING: { label: "Non ci sarò", color: "default" },
};

function statusMeta(r: ResponseRow) {
  // Un esterno "Non ci sarò" viene solo agli extra.
  if (r.kind === "guest" && r.status === "NOT_GOING") {
    return { label: "Solo agli extra", color: "default" as const };
  }
  return STATUS_META[r.status];
}

/**
 * Risposte a un evento per lo staff: totali, chi viene a ciascun extra, elenco
 * con note (allergie, esigenze) ed esterni sotto chi li ha portati, e il CSV da
 * mandare al ristorante. Gli esterni li vede solo chi li ha aggiunti, quindi
 * qui si segnalano i possibili doppioni.
 */
export default function EventResponsesDialog({ eventId, onClose }: EventResponsesDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [optionFilter, setOptionFilter] = useState<string | null>(null);
  // Solo chi puo' giocare (ha un ruolo Baskin): per le partite di dimostrazione.
  const [playersOnly, setPlayersOnly] = useState(false);

  const query = useQuery({
    queryKey: ["event-responses", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<ResponsesPayload> => {
      const res = await fetch(`/api/events/${eventId}/responses`);
      if (!res.ok) throw new Error(await readError(res));
      return res.json();
    },
  });
  const data = query.data;

  const handleClose = () => {
    setOptionFilter(null);
    setPlayersOnly(false);
    onClose();
  };

  const optionLabel = new Map(data?.options.map((o) => [o.id, o.label]));
  const rows = (data?.rows ?? []).filter(
    (r) =>
      (!optionFilter || r.optionIds.includes(optionFilter)) && (!playersOnly || r.sportRole != null)
  );
  const filtered = !!optionFilter || playersOnly;

  return (
    <Dialog
      open={!!eventId}
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      aria-labelledby="event-responses-title"
    >
      <DialogTitle id="event-responses-title" sx={{ pr: 7 }}>
        <Typography
          component="span"
          variant="h6"
          fontWeight={FONT_WEIGHT.bold}
          sx={{ display: "block" }}
        >
          Risposte
        </Typography>
        {data && (
          <Typography component="span" variant="body2" color="text.secondary">
            {data.title}
          </Typography>
        )}
        <IconButton
          onClick={handleClose}
          aria-label="Chiudi"
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {query.isPending ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : query.isError ? (
          <InlineError
            title="Risposte non caricate."
            message={query.error instanceof Error ? query.error.message : "Errore"}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        ) : data ? (
          <Stack spacing={2.5}>
            {/* Totali: evento principale ed esterni */}
            <Box>
              <Typography variant="subtitle2" fontWeight={FONT_WEIGHT.bold} sx={{ mb: 1 }}>
                Evento principale
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {/* "Forse" non si puo' piu' scegliere: resta solo se qualcuno l'ha
                    dato prima. */}
                {(["GOING", "MAYBE", "NOT_GOING"] as const)
                  .filter((s) => s !== "MAYBE" || data.totals.MAYBE > 0)
                  .map((s) => (
                    <Chip
                      key={s}
                      label={`${STATUS_META[s].label} · ${data.totals[s]}`}
                      color={STATUS_META[s].color}
                      variant={s === "GOING" ? "filled" : "outlined"}
                    />
                  ))}
                {data.totals.guests > 0 && (
                  <Chip label={`Esterni · ${data.totals.guests}`} variant="outlined" />
                )}
              </Box>
            </Box>

            {/* Extra: toccando un extra si vede solo chi ci viene */}
            {data.options.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={FONT_WEIGHT.bold} sx={{ mb: 1 }}>
                  Extra
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    label="Tutti"
                    onClick={() => setOptionFilter(null)}
                    color={optionFilter === null ? "primary" : "default"}
                    variant={optionFilter === null ? "filled" : "outlined"}
                  />
                  {data.options.map((o) => (
                    <Chip
                      key={o.id}
                      label={`${o.label} · ${o.count}${o.guestCount ? ` (di cui ${o.guestCount} esterni)` : ""}`}
                      onClick={() => setOptionFilter(o.id)}
                      color={optionFilter === o.id ? "primary" : "default"}
                      variant={optionFilter === o.id ? "filled" : "outlined"}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                <Typography variant="subtitle2" fontWeight={FONT_WEIGHT.bold}>
                  Chi gioca
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                <Chip
                  icon={<SportsBasketballIcon />}
                  label={`Solo chi gioca · ${data.players.going}${data.players.maybe ? ` (+${data.players.maybe} forse)` : ""}`}
                  onClick={() => setPlayersOnly((v) => !v)}
                  color={playersOnly ? "primary" : "default"}
                  variant={playersOnly ? "filled" : "outlined"}
                  aria-pressed={playersOnly}
                />
                {/* Ci sarò per ruolo: servono per comporre le squadre */}
                {ROLES.map((r) => (
                  <Box
                    key={r}
                    sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
                    aria-label={`Ruolo ${r}: ${data.players.goingByRole[r] ?? 0} ci saranno`}
                  >
                    <RoleBadge role={r} />
                    <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                      {data.players.goingByRole[r] ?? 0}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Divider />

            {rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                {filtered ? "Nessuno con questi filtri." : "Ancora nessuna risposta."}
              </Typography>
            ) : (
              <Stack divider={<Divider flexItem />}>
                {rows.map((r) => {
                  const meta = statusMeta(r);
                  const isGuest = r.kind === "guest";
                  return (
                    <Box
                      key={r.id}
                      sx={{
                        py: 1.25,
                        pl: isGuest && !filtered ? 3 : 0,
                        display: "flex",
                        gap: 1.5,
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: "1 1 220px" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {isGuest && !filtered && (
                            <SubdirectoryArrowRightIcon
                              fontSize="small"
                              sx={{ color: "text.secondary" }}
                            />
                          )}
                          {r.sportRole != null && (
                            <RoleBadge role={r.sportRole} variant={r.sportRoleVariant} />
                          )}
                          <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                            {r.name || "Esterno senza nome"}
                          </Typography>
                          {r.possibleDuplicate && (
                            <Tooltip title="Stesso nome di un altro esterno o di un partecipante: forse è la stessa persona">
                              <WarningAmberIcon
                                fontSize="small"
                                sx={{ color: "warning.main" }}
                                aria-label="Possibile doppione"
                              />
                            </Tooltip>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {[
                            isGuest
                              ? `Esterno di ${r.guestOf}`
                              : r.kind === "child"
                                ? "Figlio"
                                : null,
                            r.respondedBy ? `Risposto da ${r.respondedBy}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Typography>
                        {r.note && (
                          <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic" }}>
                            {r.note}
                          </Typography>
                        )}
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.75,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Chip size="small" label={meta.label} color={meta.color} />
                        {r.optionIds.map((id) => (
                          <Chip
                            key={id}
                            size="small"
                            variant="outlined"
                            label={optionLabel.get(id)}
                          />
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Stack>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button
          href={eventId ? `/api/events/${eventId}/responses?format=csv` : undefined}
          startIcon={<DownloadIcon />}
          disabled={!data || data.rows.length === 0}
        >
          Scarica CSV
        </Button>
        <Button variant="contained" onClick={handleClose}>
          Chiudi
        </Button>
      </DialogActions>
    </Dialog>
  );
}
