import { describe, it, expect } from "vitest";
import { ChildCreateSchema, ChildPatchSchema } from "./child";
import { EventCreateSchema, EventUpdateSchema } from "./event";
import {
  CompetitiveTeamCreateSchema,
  CompetitiveTeamUpdateSchema,
} from "./competitiveTeam";
import {
  OpposingTeamCreateSchema,
  OpposingTeamUpdateSchema,
} from "./opposingTeam";
import {
  GroupCreateSchema,
  GroupUpdateSchema,
  GroupMatchCreateSchema,
} from "./group";

// --- ChildCreateSchema ---

describe("ChildCreateSchema", () => {
  it("accetta un payload minimo (solo nome)", () => {
    expect(ChildCreateSchema.safeParse({ name: "Anna" }).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = {
      name: "Marco Bianchi",
      sportRole: 3,
      sportRoleVariant: "5a",
      gender: "MALE",
      birthDate: "2012-05-20",
    };
    expect(ChildCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta nome vuoto", () => {
    const result = ChildCreateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("obbligatorio");
    }
  });

  it("rifiuta nome oltre 60 caratteri", () => {
    expect(ChildCreateSchema.safeParse({ name: "a".repeat(61) }).success).toBe(false);
  });

  it("rifiuta sportRole 0 (fuori range)", () => {
    expect(ChildCreateSchema.safeParse({ name: "Anna", sportRole: 0 }).success).toBe(false);
  });

  it("rifiuta sportRole 6 (fuori range)", () => {
    expect(ChildCreateSchema.safeParse({ name: "Anna", sportRole: 6 }).success).toBe(false);
  });

  it("accetta sportRole null (non assegnato)", () => {
    expect(ChildCreateSchema.safeParse({ name: "Anna", sportRole: null }).success).toBe(true);
  });

  it("rifiuta gender non valido", () => {
    expect(ChildCreateSchema.safeParse({ name: "Anna", gender: "OTHER" }).success).toBe(false);
  });

  it("accetta gender FEMALE", () => {
    expect(ChildCreateSchema.safeParse({ name: "Anna", gender: "FEMALE" }).success).toBe(true);
  });

  it("accetta gender null", () => {
    expect(ChildCreateSchema.safeParse({ name: "Anna", gender: null }).success).toBe(true);
  });

  it("rifiuta sportRoleVariant oltre 50 caratteri", () => {
    expect(
      ChildCreateSchema.safeParse({ name: "Anna", sportRoleVariant: "x".repeat(51) }).success
    ).toBe(false);
  });
});

describe("ChildPatchSchema", () => {
  it("accetta un payload vuoto (tutti opzionali)", () => {
    expect(ChildPatchSchema.safeParse({}).success).toBe(true);
  });

  it("accetta aggiornamento parziale con solo il nome", () => {
    expect(ChildPatchSchema.safeParse({ name: "Nuovo Nome" }).success).toBe(true);
  });

  it("rifiuta nome vuoto (se fornito)", () => {
    const result = ChildPatchSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("vuoto");
    }
  });

  it("accetta linkEmail valida", () => {
    expect(ChildPatchSchema.safeParse({ linkEmail: "genitore@example.com" }).success).toBe(true);
  });

  it("rifiuta linkEmail malformata", () => {
    const result = ChildPatchSchema.safeParse({ linkEmail: "non-valida" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("non valida");
    }
  });

  it("accetta unlinkAccount true", () => {
    expect(ChildPatchSchema.safeParse({ unlinkAccount: true }).success).toBe(true);
  });
});

// --- EventCreateSchema ---

describe("EventCreateSchema", () => {
  const base = { title: "Torneo estivo", date: "2025-07-15" };

  it("accetta un payload minimo valido", () => {
    expect(EventCreateSchema.safeParse(base).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = {
      ...base,
      endDate: "2025-07-16",
      location: "Palazzetto dello Sport",
      description: "Torneo di fine anno con 8 squadre partecipanti.",
    };
    expect(EventCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta titolo vuoto", () => {
    const result = EventCreateSchema.safeParse({ ...base, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("obbligatorio");
    }
  });

  it("rifiuta titolo oltre 200 caratteri", () => {
    expect(EventCreateSchema.safeParse({ ...base, title: "x".repeat(201) }).success).toBe(false);
  });

  it("rifiuta data vuota", () => {
    expect(EventCreateSchema.safeParse({ ...base, date: "" }).success).toBe(false);
  });

  it("rifiuta location oltre 200 caratteri", () => {
    expect(EventCreateSchema.safeParse({ ...base, location: "x".repeat(201) }).success).toBe(false);
  });

  it("rifiuta description oltre 2000 caratteri", () => {
    expect(
      EventCreateSchema.safeParse({ ...base, description: "x".repeat(2001) }).success
    ).toBe(false);
  });

  it("accetta endDate null", () => {
    expect(EventCreateSchema.safeParse({ ...base, endDate: null }).success).toBe(true);
  });
});

describe("EventUpdateSchema", () => {
  it("accetta un oggetto vuoto (tutti opzionali)", () => {
    expect(EventUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("rifiuta titolo vuoto (se fornito)", () => {
    expect(EventUpdateSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("accetta location null (rimozione luogo)", () => {
    expect(EventUpdateSchema.safeParse({ location: null }).success).toBe(true);
  });

  it("accetta endDate null (rimozione data fine)", () => {
    expect(EventUpdateSchema.safeParse({ endDate: null }).success).toBe(true);
  });

  it("accetta description null (rimozione descrizione)", () => {
    expect(EventUpdateSchema.safeParse({ description: null }).success).toBe(true);
  });
});

// --- CompetitiveTeamCreateSchema ---

describe("CompetitiveTeamCreateSchema", () => {
  const base = { name: "Under 18", season: "2025-26" };

  it("accetta un payload minimo valido", () => {
    expect(CompetitiveTeamCreateSchema.safeParse(base).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = {
      ...base,
      championship: "Serie C",
      color: "#FF6600",
      description: "Squadra agonistica under 18",
    };
    expect(CompetitiveTeamCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta nome vuoto", () => {
    const result = CompetitiveTeamCreateSchema.safeParse({ ...base, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("obbligatorio");
    }
  });

  it("rifiuta nome oltre 200 caratteri", () => {
    expect(
      CompetitiveTeamCreateSchema.safeParse({ ...base, name: "x".repeat(201) }).success
    ).toBe(false);
  });

  it("rifiuta stagione in formato non corretto", () => {
    expect(CompetitiveTeamCreateSchema.safeParse({ ...base, season: "2025-2026" }).success).toBe(false);
    expect(CompetitiveTeamCreateSchema.safeParse({ ...base, season: "25-26" }).success).toBe(false);
    expect(CompetitiveTeamCreateSchema.safeParse({ ...base, season: "2025" }).success).toBe(false);
  });

  it("accetta stagioni in formato YYYY-YY valide", () => {
    expect(CompetitiveTeamCreateSchema.safeParse({ ...base, season: "2024-25" }).success).toBe(true);
    expect(CompetitiveTeamCreateSchema.safeParse({ ...base, season: "2030-31" }).success).toBe(true);
  });

  it("rifiuta colore in formato non hex", () => {
    expect(CompetitiveTeamCreateSchema.safeParse({ ...base, color: "orange" }).success).toBe(false);
    expect(CompetitiveTeamCreateSchema.safeParse({ ...base, color: "#GG0000" }).success).toBe(false);
    expect(CompetitiveTeamCreateSchema.safeParse({ ...base, color: "#FFF" }).success).toBe(false);
  });

  it("accetta colore hex valido (maiuscolo e minuscolo)", () => {
    expect(CompetitiveTeamCreateSchema.safeParse({ ...base, color: "#FF6600" }).success).toBe(true);
    expect(CompetitiveTeamCreateSchema.safeParse({ ...base, color: "#ff6600" }).success).toBe(true);
  });
});

describe("CompetitiveTeamUpdateSchema", () => {
  it("accetta un oggetto vuoto (tutti opzionali)", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("rifiuta nome vuoto (se fornito)", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accetta color null (rimozione colore)", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({ color: null }).success).toBe(true);
  });

  it("accetta championship null (rimozione campionato)", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({ championship: null }).success).toBe(true);
  });

  it("rifiuta stagione in formato non corretto (se fornita)", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({ season: "2025-2026" }).success).toBe(false);
  });
});

// --- OpposingTeamCreateSchema ---

describe("OpposingTeamCreateSchema", () => {
  it("accetta un payload minimo (solo nome)", () => {
    expect(OpposingTeamCreateSchema.safeParse({ name: "Basket Vicenza" }).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = { name: "Basket Vicenza", city: "Vicenza", notes: "Buona difesa a zona" };
    expect(OpposingTeamCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta nome vuoto", () => {
    const result = OpposingTeamCreateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("obbligatorio");
    }
  });

  it("rifiuta nome oltre 200 caratteri", () => {
    expect(OpposingTeamCreateSchema.safeParse({ name: "x".repeat(201) }).success).toBe(false);
  });

  it("rifiuta city oltre 200 caratteri", () => {
    expect(
      OpposingTeamCreateSchema.safeParse({ name: "Team A", city: "x".repeat(201) }).success
    ).toBe(false);
  });

  it("rifiuta notes oltre 2000 caratteri", () => {
    expect(
      OpposingTeamCreateSchema.safeParse({ name: "Team A", notes: "x".repeat(2001) }).success
    ).toBe(false);
  });
});

describe("OpposingTeamUpdateSchema", () => {
  it("accetta un oggetto vuoto (tutti opzionali)", () => {
    expect(OpposingTeamUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("rifiuta nome vuoto (se fornito)", () => {
    expect(OpposingTeamUpdateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accetta city null (rimozione città)", () => {
    expect(OpposingTeamUpdateSchema.safeParse({ city: null }).success).toBe(true);
  });

  it("accetta notes null (rimozione note)", () => {
    expect(OpposingTeamUpdateSchema.safeParse({ notes: null }).success).toBe(true);
  });
});

// --- GroupCreateSchema / GroupUpdateSchema / GroupMatchCreateSchema ---

describe("GroupCreateSchema", () => {
  const base = { name: "Girone A", season: "2025-26", teamId: "team-xyz" };

  it("accetta un payload minimo valido", () => {
    expect(GroupCreateSchema.safeParse(base).success).toBe(true);
  });

  it("accetta championship opzionale", () => {
    expect(GroupCreateSchema.safeParse({ ...base, championship: "Serie C" }).success).toBe(true);
  });

  it("rifiuta nome vuoto", () => {
    const result = GroupCreateSchema.safeParse({ ...base, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("obbligatorio");
    }
  });

  it("rifiuta nome oltre 200 caratteri", () => {
    expect(GroupCreateSchema.safeParse({ ...base, name: "x".repeat(201) }).success).toBe(false);
  });

  it("rifiuta stagione in formato non corretto", () => {
    expect(GroupCreateSchema.safeParse({ ...base, season: "25-26" }).success).toBe(false);
  });

  it("rifiuta teamId vuoto", () => {
    const result = GroupCreateSchema.safeParse({ ...base, teamId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("obbligatorio");
    }
  });
});

describe("GroupUpdateSchema", () => {
  it("accetta un oggetto vuoto (tutti opzionali)", () => {
    expect(GroupUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("rifiuta nome vuoto (se fornito)", () => {
    expect(GroupUpdateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accetta championship null (rimozione campionato)", () => {
    expect(GroupUpdateSchema.safeParse({ championship: null }).success).toBe(true);
  });
});

describe("GroupMatchCreateSchema", () => {
  const base = { homeTeamId: "team-1", awayTeamId: "team-2" };

  it("accetta un payload minimo valido", () => {
    expect(GroupMatchCreateSchema.safeParse(base).success).toBe(true);
  });

  it("accetta un payload completo con punteggi", () => {
    const full = {
      ...base,
      matchday: 3,
      date: "2025-11-10",
      homeScore: 45,
      awayScore: 32,
    };
    expect(GroupMatchCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta se homeTeamId === awayTeamId (stessa squadra)", () => {
    const result = GroupMatchCreateSchema.safeParse({ homeTeamId: "team-1", awayTeamId: "team-1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("diverse");
    }
  });

  it("rifiuta homeTeamId vuoto", () => {
    expect(GroupMatchCreateSchema.safeParse({ homeTeamId: "", awayTeamId: "team-2" }).success).toBe(false);
  });

  it("rifiuta awayTeamId vuoto", () => {
    expect(GroupMatchCreateSchema.safeParse({ homeTeamId: "team-1", awayTeamId: "" }).success).toBe(false);
  });

  it("rifiuta matchday non intero", () => {
    expect(GroupMatchCreateSchema.safeParse({ ...base, matchday: 1.5 }).success).toBe(false);
  });

  it("rifiuta matchday 0 (fuori range)", () => {
    expect(GroupMatchCreateSchema.safeParse({ ...base, matchday: 0 }).success).toBe(false);
  });

  it("rifiuta punteggio negativo", () => {
    expect(GroupMatchCreateSchema.safeParse({ ...base, homeScore: -1 }).success).toBe(false);
    expect(GroupMatchCreateSchema.safeParse({ ...base, awayScore: -1 }).success).toBe(false);
  });

  it("accetta punteggio 0", () => {
    expect(GroupMatchCreateSchema.safeParse({ ...base, homeScore: 0, awayScore: 0 }).success).toBe(true);
  });

  it("accetta matchday null", () => {
    expect(GroupMatchCreateSchema.safeParse({ ...base, matchday: null }).success).toBe(true);
  });

  it("accetta date null", () => {
    expect(GroupMatchCreateSchema.safeParse({ ...base, date: null }).success).toBe(true);
  });
});
