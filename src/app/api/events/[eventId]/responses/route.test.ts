import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/apiAuth", () => ({ panelGuard: vi.fn() }));
vi.mock("@/lib/eventResponses", () => ({ loadEventResponses: vi.fn() }));

import { GET } from "./route";
import { panelGuard } from "@/lib/apiAuth";
import { loadEventResponses } from "@/lib/eventResponses";

const mockGuard = panelGuard as unknown as Mock;
const mockLoad = loadEventResponses as unknown as Mock;
const params = { params: Promise.resolve({ eventId: "evt-1" }) };
const get = (q = "") =>
  GET(new NextRequest(`http://localhost/api/events/evt-1/responses${q}`), params);

const data = {
  event: { id: "evt-1", slug: "festa", title: "Festa" },
  options: [{ id: "lunch", label: "Pranzo", count: 1, guestCount: 1 }],
  totals: { GOING: 1, MAYBE: 0, NOT_GOING: 1, guests: 1 },
  players: { going: 1, maybe: 0, goingByRole: { 3: 1 } },
  rows: [
    {
      id: "a1",
      name: "=Paola",
      kind: "user",
      status: "GOING",
      optionIds: [],
      note: "celiaca",
      guestOf: null,
      respondedBy: null,
      possibleDuplicate: false,
      sportRole: 3,
      sportRoleVariant: "T",
    },
    {
      id: "a2",
      name: "",
      kind: "guest",
      status: "NOT_GOING",
      optionIds: ["lunch"],
      note: null,
      guestOf: "Paola",
      respondedBy: null,
      possibleDuplicate: true,
      sportRole: null,
      sportRoleVariant: null,
    },
  ],
};

describe("GET /api/events/[eventId]/responses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGuard.mockResolvedValue(null);
    mockLoad.mockResolvedValue(data);
  });

  it("solo staff: restituisce la risposta della guardia", async () => {
    mockGuard.mockResolvedValue(NextResponse.json({ error: "Non autorizzato" }, { status: 403 }));
    expect((await get()).status).toBe(403);
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it("404 se l'evento non esiste", async () => {
    mockLoad.mockResolvedValue(null);
    expect((await get()).status).toBe(404);
  });

  it("JSON con titolo, extra, totali e righe", async () => {
    const json = await (await get()).json();
    expect(json).toMatchObject({ title: "Festa", totals: data.totals, options: data.options });
    expect(json.rows).toHaveLength(2);
  });

  it("CSV per Excel: allegato, colonne degli extra, esterni e formule neutralizzate", async () => {
    const res = await get("?format=csv");
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("risposte-festa.csv");
    const text = await res.text();
    const lines = text.replace("﻿", "").split("\r\n");
    expect(lines[0]).toBe(
      '"Nome";"Tipo";"Ruolo Baskin";"Evento principale";"Pranzo";"Note";"Esterno di";"Risposto da";"Possibile doppione"'
    );
    expect(lines[1]).toBe('"\'=Paola";"Tesserato";"Ruolo 3T";"Ci sarò";"";"celiaca";"";"";""');
    expect(lines[2]).toBe(
      '"Esterno senza nome";"Esterno";"";"Solo agli extra";"Sì";"";"Paola";"";"Sì"'
    );
    expect(text).toContain('"Pranzo";"1";"di cui esterni: 1"');
    expect(text).toContain('"Ruolo 3 (ci sarò)";"1"');
  });
});
