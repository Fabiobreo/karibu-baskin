import { Box, Button, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import RoleBadge from "@/components/common/RoleBadge";
import type { EventResponses, ResponseRow } from "@/lib/eventResponses";
import { FONT_WEIGHT } from "@/lib/fontWeight";
import { RADIUS } from "@/lib/radius";

interface EventResponsesPanelProps {
  eventId: string;
  responses: EventResponses;
}

/**
 * Le risposte a un evento, nella pagina dell'evento, per la direzione e lo
 * staff: totali, conti degli extra e l'elenco come nel CSV (chi, risposta,
 * extra, nota, esterni sotto chi li ha portati), più il CSV da scaricare.
 *
 * Il dirigente vedeva solo il contatore "N ci saranno": il dettaglio stava nel
 * pannello staff, dove ci arrivava a fatica (suggerimento del 15/10/2026).
 * Versione semplice, senza filtri: i filtri per extra e per chi gioca restano
 * in /admin/eventi (`EventResponsesDialog`). La pagina riceve i dati solo se
 * chi guarda può vederli (`canViewAdminPanel`).
 */
export default function EventResponsesPanel({ eventId, responses }: EventResponsesPanelProps) {
  const t = useTranslations("events.responses");
  const optionLabel = new Map(responses.options.map((o) => [o.id, o.label]));
  const { totals } = responses;

  const statusLabel = (r: ResponseRow) =>
    // Un esterno "Non ci sarò" viene solo agli extra.
    r.kind === "guest" && r.status === "NOT_GOING"
      ? t("statusExtrasOnly")
      : r.status === "GOING"
        ? t("statusGoing")
        : r.status === "MAYBE"
          ? t("statusMaybe")
          : t("statusNotGoing");

  const summary = [
    t("totalGoing", { count: totals.GOING }),
    t("totalNotGoing", { count: totals.NOT_GOING }),
    // "Forse" non si sceglie più: resta solo se qualcuno l'ha dato prima.
    totals.MAYBE > 0 ? t("totalMaybe", { count: totals.MAYBE }) : null,
    totals.guests > 0 ? t("totalGuests", { count: totals.guests }) : null,
  ].filter(Boolean);

  return (
    <Paper
      component="section"
      aria-labelledby="event-responses-title"
      elevation={0}
      variant="outlined"
      sx={{ p: 3, borderRadius: RADIUS.lg }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography
          id="event-responses-title"
          variant="h6"
          component="h2"
          fontWeight={FONT_WEIGHT.bold}
        >
          {t("title")}
        </Typography>
        <Button
          href={`/api/events/${eventId}/responses?format=csv`}
          variant="outlined"
          disabled={responses.rows.length === 0}
        >
          {t("csv")}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("whoSees")}
      </Typography>

      <Typography variant="body1" fontWeight={FONT_WEIGHT.semibold}>
        {summary.join(" · ")}
      </Typography>
      {responses.options.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {responses.options
            .map((o) => t("extraCount", { label: o.label, count: o.count }))
            .join(" · ")}
        </Typography>
      )}

      <Divider sx={{ my: 2 }} />

      {responses.rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("none")}
        </Typography>
      ) : (
        <Stack divider={<Divider flexItem />}>
          {responses.rows.map((r) => {
            const isGuest = r.kind === "guest";
            const details = [
              isGuest
                ? t("guestOf", { name: r.guestOf ?? "" })
                : r.kind === "child"
                  ? t("child")
                  : null,
              r.respondedBy ? t("respondedBy", { name: r.respondedBy }) : null,
              r.possibleDuplicate ? t("possibleDuplicate") : null,
            ].filter(Boolean);
            return (
              <Box
                key={r.id}
                sx={{
                  py: 1.25,
                  // Gli esterni sotto chi li ha portati, rientrati.
                  pl: isGuest ? 3 : 0,
                  display: "flex",
                  gap: 1.5,
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ minWidth: 0, flex: "1 1 200px" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    {r.sportRole != null && (
                      <RoleBadge role={r.sportRole} variant={r.sportRoleVariant} />
                    )}
                    <Typography variant="body2" fontWeight={FONT_WEIGHT.semibold}>
                      {r.name || t("unnamedGuest")}
                    </Typography>
                  </Box>
                  {details.length > 0 && (
                    <Typography variant="caption" color="text.secondary" component="div">
                      {details.join(" · ")}
                    </Typography>
                  )}
                  {r.note && (
                    <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic" }}>
                      {r.note}
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}
                >
                  {/* La risposta in parole, neutra: verde/ambra solo per la
                      valenza, e qui conta leggere chi viene (UX-29). */}
                  <Chip
                    size="small"
                    label={statusLabel(r)}
                    variant={r.status === "GOING" ? "filled" : "outlined"}
                  />
                  {r.optionIds.map((id) => (
                    <Chip key={id} size="small" variant="outlined" label={optionLabel.get(id)} />
                  ))}
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
