import { describe, expect, it } from "vitest";
import { getBaskinQuiz, QUIZ_SOURCES, QUIZ_TEXTS_FOR_TEST } from "./baskinQuiz";
import { EASY_PER_ROUND, MEDIUM_PER_ROUND } from "@/lib/games/quiz";
import fs from "node:fs";
import path from "node:path";

const it_ = getBaskinQuiz("it");
const en = getBaskinQuiz("en");

describe("banca delle domande del quiz", () => {
  it("ha fra 30 e 40 domande, con gli stessi id nelle due lingue", () => {
    expect(it_.length).toBeGreaterThanOrEqual(30);
    expect(it_.length).toBeLessThanOrEqual(40);
    expect(en.map((q) => q.id)).toEqual(it_.map((q) => q.id));
    expect(Object.keys(QUIZ_TEXTS_FOR_TEST.en).sort()).toEqual(
      Object.keys(QUIZ_TEXTS_FOR_TEST.it).sort()
    );
  });

  it("ha id unici", () => {
    expect(new Set(it_.map((q) => q.id)).size).toBe(it_.length);
  });

  it("ogni domanda ha 3 risposte diverse, un indice valido e una spiegazione", () => {
    for (const q of [...it_, ...en]) {
      expect(q.answers).toHaveLength(3);
      expect(new Set(q.answers).size, q.id).toBe(3);
      expect([0, 1, 2]).toContain(q.correct);
      expect(q.text.trim().length, q.id).toBeGreaterThan(0);
      expect(q.explanation.trim().length, q.id).toBeGreaterThan(0);
    }
  });

  it("la risposta giusta non sta sempre nello stesso posto", () => {
    const positions = new Set(it_.map((q) => q.correct));
    expect(positions.size).toBe(3);
  });

  it("ha abbastanza domande per livello per due partite di fila senza ripetere", () => {
    expect(it_.filter((q) => q.level === "facile").length).toBeGreaterThanOrEqual(
      EASY_PER_ROUND * 2
    );
    expect(it_.filter((q) => q.level === "medio").length).toBeGreaterThanOrEqual(
      MEDIUM_PER_ROUND * 2
    );
  });

  it("ogni 'Scopri di più' porta a una pagina che esiste, con l'ancora presente", () => {
    for (const source of QUIZ_SOURCES) {
      const [route, anchor] = source.split("#");
      const page = path.join(
        process.cwd(),
        "src",
        "app",
        ...route.split("/").filter(Boolean),
        "page.tsx"
      );
      expect(fs.existsSync(page), source).toBe(true);
      if (anchor) {
        const files = [page, ...componentsFor(route)];
        const found = files.some((f) => fs.readFileSync(f, "utf8").includes(`"${anchor}"`));
        expect(found, source).toBe(true);
      }
    }
  });
});

/** Componenti in cui sta l'ancora quando non è nella pagina. */
function componentsFor(route: string): string[] {
  if (route === "/contatti") {
    return [path.join(process.cwd(), "src", "components", "common", "TryItSection.tsx")];
  }
  return [];
}
