import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getGuide, type Guide } from "./guide";
import itMessages from "@/i18n/messages/it.json";
import enMessages from "@/i18n/messages/en.json";

const it_ = getGuide("it");
const en = getGuide("en");

const chapters = (guide: Guide) => guide.groups.flatMap((g) => g.chapters);

function strings(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (obj && typeof obj === "object") return Object.values(obj).flatMap(strings);
  return [];
}

/** Percorsi delle pagine dell'app, senza i route group `(nome)`. */
function appRoutes(dir = join(process.cwd(), "src/app"), prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      const segment = /^\(.*\)$/.test(entry.name) ? "" : `/${entry.name}`;
      return appRoutes(join(dir, entry.name), prefix + segment);
    }
    return entry.name === "page.tsx" ? [prefix || "/"] : [];
  });
}

describe("guida all'app", () => {
  it("stessi capitoli, nello stesso ordine, nelle due lingue", () => {
    expect(chapters(en).map((c) => c.id)).toEqual(chapters(it_).map((c) => c.id));
    expect(en.groups.map((g) => g.chapters.length)).toEqual(
      it_.groups.map((g) => g.chapters.length)
    );
  });

  it("le ancore sono uniche", () => {
    const ids = chapters(it_).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("i passi iniziali rimandano a capitoli che esistono", () => {
    const ids = chapters(it_).map((c) => c.id);
    for (const guide of [it_, en]) {
      for (const step of guide.start) expect(ids).toContain(step.chapterId);
    }
    expect(en.start.map((s) => s.chapterId)).toEqual(it_.start.map((s) => s.chapterId));
  });

  it("stessi link nelle due lingue, tutti verso pagine che esistono", () => {
    const routes = appRoutes();
    const hrefs = (guide: Guide) => chapters(guide).map((c) => (c.links ?? []).map((l) => l.href));
    expect(hrefs(en)).toEqual(hrefs(it_));
    for (const href of hrefs(it_).flat()) {
      expect(routes, href).toContain(href.split(/[?#]/)[0]);
    }
  });

  // La guida cita le etichette dell'app fra virgolette: se un'etichetta
  // cambia nel dizionario, il capitolo va aggiornato.
  it.each([
    // Etichette del telefono, non nostre.
    [
      "it",
      it_,
      itMessages,
      /«([^»]+)»/g,
      ["Consenti", "Aggiungi a schermata Home", "Installa app"],
    ],
    ["en", en, enMessages, /"([^"]+)"/g, ["Allow", "Add to Home screen", "Install app"]],
  ] as const)(
    "le etichette citate esistono nel dizionario (%s)",
    (_l, guide, messages, re, system) => {
      const dictionary = strings(messages);
      const texts = chapters(guide).flatMap((c) => [...c.steps, c.note ?? ""]);
      const quoted = texts.flatMap((s) => [...s.matchAll(re)].map((m) => m[1].replace(/…$/, "")));
      expect(quoted.length).toBeGreaterThan(10);
      const missing = quoted.filter(
        (label) =>
          !(system as readonly string[]).includes(label) &&
          !dictionary.some((d) => d.includes(label))
      );
      expect(missing).toEqual([]);
    }
  );

  it("ogni capitolo ha contenuto, e l'installazione i passi per i due telefoni", () => {
    for (const guide of [it_, en]) {
      for (const chapter of chapters(guide)) {
        expect(chapter.steps.length, chapter.id).toBeGreaterThan(0);
      }
      const install = chapters(guide).find((c) => c.id === "installare")?.install;
      expect(install?.android.length).toBeGreaterThan(0);
      expect(install?.ios.length).toBeGreaterThan(0);
    }
  });

  it("nessuna barra obliqua di genere in italiano (linguaggio facile)", () => {
    const texts = [
      ...it_.start.flatMap((s) => [s.title, s.text]),
      ...chapters(it_).flatMap((c) => [c.title, ...c.steps, c.note ?? ""]),
    ];
    expect(texts.filter((s) => /[a-zàèéìòù]\/[ae]\b/.test(s))).toEqual([]);
  });
});
