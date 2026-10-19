import { describe, expect, it } from "vitest";
import { excerpt, newSuggestionNotice, noteNotices } from "./suggestionNotify";

describe("excerpt", () => {
  it("comprime spazi e a capo", () => {
    expect(excerpt("  ciao \n\n  mondo  ")).toBe("ciao mondo");
  });
  it("non taglia sotto il limite", () => {
    expect(excerpt("abc def", 7)).toBe("abc def");
  });
  it("taglia sulla parola con …", () => {
    expect(excerpt("uno due tre quattro", 12)).toBe("uno due tre…");
  });
});

describe("newSuggestionNotice", () => {
  const s = { id: "s1", category: "APP" as const, message: "Più luce", authorId: "u1" };
  it("esclude l'autore staff", () => {
    const n = newSuggestionNotice(s, ["u1", "u2"]);
    expect(n?.ids).toEqual(["u2"]);
    expect(n?.title).toBe("Nuovo suggerimento");
    expect(n?.body).toBe("App / sito: Più luce");
    expect(n?.url).toBe("/admin/suggerimenti?apri=s1");
  });
  it("lista vuota: null", () => {
    expect(newSuggestionNotice(s, ["u1"])).toBeNull();
    expect(newSuggestionNotice(s, [])).toBeNull();
  });
});

describe("noteNotices", () => {
  const base = {
    suggestionId: "s1",
    suggestionAuthorId: "autore",
    writerId: "w",
    writerName: "Marco Rossi",
    previousNoteAuthorIds: ["a", "a", "w", "b"],
    body: "Testo",
    isReply: false,
  };

  it("nota interna: solo i partecipanti, senza duplicati né chi scrive", () => {
    const out = noteNotices(base);
    expect(out).toHaveLength(1);
    expect(out[0].ids).toEqual(["a", "b"]);
    expect(out[0].title).toBe("Nuova nota su un suggerimento");
    expect(out[0].body).toBe("Marco: Testo");
  });

  it("nota interna: l'autore staff che ha già scritto lì è un partecipante", () => {
    const out = noteNotices({ ...base, previousNoteAuthorIds: ["autore", "a"] });
    expect(out).toHaveLength(1);
    expect(out[0].ids).toEqual(["autore", "a"]);
    expect(out[0].title).toBe("Nuova nota su un suggerimento");
  });
  it("risposta: l'autore riceve l'avviso senza il nome dello staff", () => {
    const out = noteNotices({ ...base, isReply: true });
    const author = out.find((n) => n.ids.includes("autore"));
    expect(author?.title).toBe("Lo staff ha risposto al tuo suggerimento");
    expect(author?.body).toBe("Testo");
    expect(author?.url).toBe("/profilo/suggerimenti#s-s1");
    expect(JSON.stringify(author)).not.toContain("Marco");
    const staff = out.find((n) => n.ids.includes("a"));
    expect(staff?.title).toBe("Risposta inviata all'autore di un suggerimento");
  });

  it("risposta scritta dall'autore stesso: nessun avviso all'autore", () => {
    const out = noteNotices({ ...base, isReply: true, writerId: "autore" });
    expect(out.some((n) => n.ids.includes("autore"))).toBe(false);
  });

  it("autore anche fra i partecipanti: un solo avviso, quello da autore", () => {
    const out = noteNotices({
      ...base,
      isReply: true,
      previousNoteAuthorIds: ["autore", "a"],
    });
    expect(out.filter((n) => n.ids.includes("autore"))).toHaveLength(1);
    expect(out.find((n) => n.ids.includes("autore"))?.title).toBe(
      "Lo staff ha risposto al tuo suggerimento"
    );
  });

  it("nessuna stringa con em dash", () => {
    const out = noteNotices({ ...base, isReply: true });
    expect(JSON.stringify(out)).not.toContain("—");
  });
});
