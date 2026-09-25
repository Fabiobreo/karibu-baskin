import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import it_ from "./messages/it.json";
import en from "./messages/en.json";

// Linguaggio facile (UX-17): regole sui dizionari che un refactoring potrebbe
// rompere senza che nessuno se ne accorga.

function strings(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (obj && typeof obj === "object") return Object.values(obj).flatMap(strings);
  return [];
}

describe("linguaggio facile", () => {
  it("nessuna barra obliqua di genere nel dizionario italiano", () => {
    const offenders = strings(it_).filter((s) => /[a-zàèéìòù]\/[ae]\b/.test(s));
    expect(offenders).toEqual([]);
  });

  it.each([
    ["it", it_, "Come si muove Giulia quando fa sport?", "Come ti muovi quando fai sport?"],
    ["en", en, "How does Giulia move when doing sport?", "How do you move when you do sport?"],
  ])("questionario in terza persona per un figlio (%s)", (locale, messages, child, self) => {
    const t = createTranslator({ locale, messages, namespace: "trainings.questionnaire" });
    expect(t("mobility.question", { who: "child", name: "Giulia" })).toBe(child);
    expect(t("mobility.question", { who: "self", name: "" })).toBe(self);
  });

  it("frase del traguardo raggiunto in seconda e terza persona", () => {
    const t = createTranslator({ locale: "it", messages: it_, namespace: "badges" });
    expect(t("doppia_cifra.achieved", { who: "self" })).toBe(
      "Hai segnato almeno 10 punti in una partita"
    );
    expect(t("doppia_cifra.achieved", { who: "other" })).toBe(
      "Ha segnato almeno 10 punti in una partita"
    );
  });

  it("ogni traguardo ha nome, criterio e frase in entrambe le lingue", () => {
    for (const messages of [it_, en]) {
      for (const [id, badge] of Object.entries(messages.badges)) {
        expect(Object.keys(badge).sort(), id).toEqual(["achieved", "description", "label"]);
      }
    }
  });
});
