import { describe, it, expect } from "vitest";
import { foldLine, icsEscape } from "./ics";

describe("foldLine", () => {
  it("non spezza le lettere accentate al confine dei 75 ottetti", () => {
    // Il limite RFC 5545 si conta in byte, ma il taglio deve cadere fra un
    // carattere e l'altro: tagliando a byte fissi, un accento a cavallo del
    // confine si spaccava in due meta' che diventano il carattere di
    // sostituzione. Si prova ogni allineamento, non uno fortunato.
    for (let extra = 0; extra < 40; extra++) {
      const testo = "a".repeat(extra) + "mercoledì sera, ore 19, palestra di Montecchio Maggiore";
      const riga = `SUMMARY:${testo}`;
      const piegata = foldLine(riga);
      expect(piegata, `padding ${extra}`).not.toContain("\uFFFD");
      expect(piegata.split("\r\n ").join(""), `padding ${extra}`).toBe(riga);
    }
  });

  it("tiene ogni riga entro i 75 ottetti", () => {
    const riga = `SUMMARY:${"Allenamento congiunto di mercoledì sera ".repeat(6)}`;
    for (const parte of foldLine(riga).split("\r\n")) {
      expect(new TextEncoder().encode(parte).length).toBeLessThanOrEqual(75);
    }
  });

  it("lascia intatte le righe corte", () => {
    expect(foldLine("SUMMARY:Allenamento")).toBe("SUMMARY:Allenamento");
  });
});

describe("icsEscape", () => {
  it("protegge i separatori di iCalendar", () => {
    expect(icsEscape("Torneo, sabato; ore 9")).toBe("Torneo\\, sabato\\; ore 9");
  });
});
