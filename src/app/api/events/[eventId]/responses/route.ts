import { NextRequest, NextResponse } from "next/server";
import type { EventAttendanceStatus } from "@prisma/client";
import { panelGuard } from "@/lib/apiAuth";
import { loadEventResponses, type ResponseRow } from "@/lib/eventResponses";
import { csvResponse, csvRow } from "@/lib/csv";
import { ROLES, sportRoleLabel } from "@/lib/constants";

type Params = { params: Promise<{ eventId: string }> };

const STATUS_IT: Record<EventAttendanceStatus, string> = {
  GOING: "Ci sarò",
  MAYBE: "Forse",
  NOT_GOING: "Non ci sarò",
};

const KIND_IT: Record<ResponseRow["kind"], string> = {
  user: "Tesserato",
  child: "Figlio",
  guest: "Esterno",
};

// Un esterno "Non ci sarò" viene solo agli extra (non si aggiunge per non venire).
const statusLabel = (r: ResponseRow) =>
  r.kind === "guest" && r.status === "NOT_GOING" ? "Solo agli extra" : STATUS_IT[r.status];

// GET /api/events/[eventId]/responses[?format=csv]
// Riepilogo delle risposte per staff e dirigenti: totali, extra, elenco
// nominativo con note ed esterni. Con `format=csv` lo stesso elenco da scaricare
// (es. per il ristorante).
export async function GET(req: NextRequest, { params }: Params) {
  const denied = await panelGuard();
  if (denied) return denied;

  const { eventId } = await params;
  const data = await loadEventResponses(eventId);
  if (!data) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

  if (req.nextUrl.searchParams.get("format") !== "csv") {
    const { event, ...summary } = data;
    return NextResponse.json({ title: event.title, ...summary });
  }

  const { event, options, rows } = data;
  const lines = [
    csvRow([
      "Nome",
      "Tipo",
      "Ruolo Baskin",
      "Evento principale",
      ...options.map((o) => o.label),
      "Note",
      "Esterno di",
      "Risposto da",
      "Possibile doppione",
    ]),
    ...rows.map((r) =>
      csvRow([
        r.name || "Esterno senza nome",
        KIND_IT[r.kind],
        r.sportRole != null ? sportRoleLabel(r.sportRole, r.sportRoleVariant) : "",
        statusLabel(r),
        ...options.map((o) => (r.optionIds.includes(o.id) ? "Sì" : "")),
        r.note,
        r.guestOf,
        r.respondedBy,
        r.possibleDuplicate ? "Sì" : "",
      ])
    ),
    "",
    csvRow(["Totali"]),
    ...(["GOING", "MAYBE", "NOT_GOING"] as const).map((s) =>
      csvRow([STATUS_IT[s], data.totals[s]])
    ),
    ...options.map((o) => csvRow([o.label, o.count, `di cui esterni: ${o.guestCount}`])),
    "",
    csvRow(["Chi gioca (con un ruolo Baskin)"]),
    csvRow(["Ci sarò", data.players.going]),
    csvRow(["Forse", data.players.maybe]),
    ...ROLES.map((r) => csvRow([`Ruolo ${r} (ci sarò)`, data.players.goingByRole[r] ?? 0])),
  ];
  return csvResponse(lines, `risposte-${event.slug ?? event.id}.csv`);
}
