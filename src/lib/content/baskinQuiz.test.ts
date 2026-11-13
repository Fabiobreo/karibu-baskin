import { describe, expect, it } from "vitest";
import { QUIZ_SOURCE_LABELS, QUIZ_SOURCES } from "./baskinQuiz";
import fs from "node:fs";
import path from "node:path";

// Le domande stanno nel database (UX-67): qui restano gli elenchi chiusi.
describe('pagine "Scopri di più" del quiz', () => {
  it("ogni pagina ha la sua etichetta nel pannello", () => {
    expect(Object.keys(QUIZ_SOURCE_LABELS).sort()).toEqual([...QUIZ_SOURCES].sort());
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
