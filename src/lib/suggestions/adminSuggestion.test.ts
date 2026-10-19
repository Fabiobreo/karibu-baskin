import { describe, expect, it } from "vitest";
import { sortByActivity, toAdminSuggestion, type AdminSuggestion } from "./adminSuggestion";

const AUTHOR = { id: "staff1", name: "Anna", image: null, customImage: null };

function row(over: Record<string, unknown> = {}) {
  return {
    id: "s1",
    category: "APP" as const,
    message: "Ciao",
    status: "NUOVO" as const,
    createdAt: new Date("2026-10-01T10:00:00Z"),
    updatedAt: new Date("2026-10-01T10:00:00Z"),
    userId: "autore-segreto" as string | null,
    notes: [] as {
      id: string;
      body: string;
      isReply: boolean;
      createdAt: Date;
      author: typeof AUTHOR;
    }[],
    ...over,
  };
}

describe("toAdminSuggestion", () => {
  it("non porta mai userId", () => {
    const out = toAdminSuggestion(row());
    expect("userId" in out).toBe(false);
    expect(JSON.stringify(out)).not.toContain("autore-segreto");
  });

  it("canReply dipende da userId", () => {
    expect(toAdminSuggestion(row()).canReply).toBe(true);
    expect(toAdminSuggestion(row({ userId: null })).canReply).toBe(false);
  });

  it("lastActivityAt: ultima nota, o il suggerimento senza note", () => {
    expect(toAdminSuggestion(row()).lastActivityAt).toBe("2026-10-01T10:00:00.000Z");
    const withNotes = toAdminSuggestion(
      row({
        notes: [
          {
            id: "n1",
            body: "a",
            isReply: false,
            createdAt: new Date("2026-10-02T10:00:00Z"),
            author: AUTHOR,
          },
          {
            id: "n2",
            body: "b",
            isReply: true,
            createdAt: new Date("2026-10-05T10:00:00Z"),
            author: AUTHOR,
          },
        ],
      })
    );
    expect(withNotes.lastActivityAt).toBe("2026-10-05T10:00:00.000Z");
    expect(withNotes.notes[1].isReply).toBe(true);
  });
});

describe("sortByActivity", () => {
  it("mette prima il vecchio con una nota recente, senza mutare", () => {
    const base = toAdminSuggestion(row());
    const old: AdminSuggestion = { ...base, id: "old", lastActivityAt: "2026-10-09T00:00:00.000Z" };
    const fresh: AdminSuggestion = {
      ...base,
      id: "new",
      lastActivityAt: "2026-10-03T00:00:00.000Z",
    };
    const input = [fresh, old];
    expect(sortByActivity(input).map((s) => s.id)).toEqual(["old", "new"]);
    expect(input.map((s) => s.id)).toEqual(["new", "old"]);
  });
});
