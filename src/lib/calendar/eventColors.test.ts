import { describe, it, expect } from "vitest";
import { lightTheme, darkTheme } from "@/theme";
import { contrastRatio } from "@/lib/colorUtils";
import { decorationSx, eventVisual, teamFilterKey, typeColor, typeFilterKey } from "./eventColors";
import { isVisible } from "@/components/calendar/calendarShared";
import type { CalendarEvent, CalendarEventType } from "@/app/api/calendar/route";

const TYPES: CalendarEventType[] = ["training", "match", "event"];

function ev(partial: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "x",
    type: "training",
    title: "t",
    date: "2026-09-17T18:00:00.000Z",
    ...partial,
  };
}

describe("colori del calendario", () => {
  it("dà a ogni tipo un colore diverso, in chiaro e in scuro", () => {
    for (const theme of [lightTheme, darkTheme]) {
      const colors = TYPES.map((type) => typeColor(theme, type));
      expect(new Set(colors).size).toBe(TYPES.length);
    }
  });

  it("sceglie un testo che sta sopra il 4,5:1 su ogni colore di tipo", () => {
    // I chip della griglia hanno testo piccolo (0,65rem): la soglia è AA per
    // testo normale, non la 3:1 del testo grande. Il testo scuro esce come
    // rgba(0,0,0,0.87): qui si misura sul nero pieno, e il margine reale sui
    // colori scelti (8,6:1 e oltre) resta ampiamente sopra soglia anche velato.
    for (const theme of [lightTheme, darkTheme]) {
      for (const type of TYPES) {
        const { bg, fg } = eventVisual(theme, type);
        const ratio = contrastRatio(bg, fg.startsWith("#") ? fg : "#000000");
        expect(ratio, `${type} in ${theme.palette.mode}`).not.toBeNull();
        expect(ratio!, `${type} in ${theme.palette.mode}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("usa il colore squadra solo come accento, mai come sfondo", () => {
    const visual = eventVisual(lightTheme, "training", "#8E24AA");
    expect(visual.accent).toBe("#8E24AA");
    expect(visual.bg).toBe(typeColor(lightTheme, "training"));
  });

  it("non inventa un accento se la squadra manca", () => {
    expect(eventVisual(lightTheme, "event").accent).toBeNull();
  });
});

describe("decorazioni del chip", () => {
  it("separa la fascia squadra dal corpo del chip", () => {
    // Senza il filo del colore del foglio la fascia poggia sulla tinta satura
    // e quasi nessun colore squadra ha la luminosita' per staccarsene.
    const sx = decorationSx(lightTheme, { accent: "#8E24AA" });
    expect(sx.borderLeft).toBe("5px solid #8E24AA");
    expect(sx.boxShadow).toContain(`inset 1px 0 0 ${lightTheme.palette.background.paper}`);
  });

  it("non decora niente quando non c'è squadra né eco", () => {
    expect(decorationSx(lightTheme, {})).toEqual({});
  });

  it("marca gli impegni propri con un'eco nel colore dell'elemento", () => {
    const bg = typeColor(lightTheme, "training");
    const sx = decorationSx(lightTheme, { echo: bg });
    expect(sx.boxShadow).toBe(
      `0 0 0 1.5px ${lightTheme.palette.background.paper}, 0 0 0 3px ${bg}`
    );
  });

  it("tiene l'eco ben sopra il 3:1 sul foglio, in entrambi i temi", () => {
    // È il motivo per cui l'eco non è più `text.primary`: quella faceva 17:1,
    // cioè più del testo, e scavalcava il contenuto che doveva evidenziare.
    for (const theme of [lightTheme, darkTheme]) {
      for (const type of TYPES) {
        const ratio = contrastRatio(typeColor(theme, type), theme.palette.background.paper);
        expect(ratio, `${type} in ${theme.palette.mode}`).not.toBeNull();
        expect(ratio!, `${type} in ${theme.palette.mode}`).toBeGreaterThanOrEqual(3);
        expect(ratio!, `${type} in ${theme.palette.mode}`).toBeLessThan(12);
      }
    }
  });

  it("combina fascia ed eco in un solo box-shadow", () => {
    // Sono due ombre sulla stessa proprietà: scritte separate, la seconda
    // cancellerebbe la prima.
    const sx = decorationSx(lightTheme, { accent: "#8E24AA", echo: "#00695C" });
    expect(sx.boxShadow?.split(", ")).toHaveLength(3);
  });
});

describe("filtri della legenda", () => {
  it("tiene distinte due squadre dello stesso colore", () => {
    // Era il bug della chiave `match:<colore>`: due squadre con lo stesso hex
    // condividevano il filtro e sparivano insieme.
    const viola = ev({ id: "a", type: "match", teamId: "t1", teamColor: "#8E24AA" });
    const anche = ev({ id: "b", type: "match", teamId: "t2", teamColor: "#8E24AA" });
    const hidden = new Set([teamFilterKey("t1")]);
    expect(isVisible(viola, hidden)).toBe(false);
    expect(isVisible(anche, hidden)).toBe(true);
  });

  it("nasconde per tipo indipendentemente dalla squadra", () => {
    const hidden = new Set([typeFilterKey("training")]);
    expect(isVisible(ev({ type: "training", teamId: "t1" }), hidden)).toBe(false);
    expect(isVisible(ev({ type: "match", teamId: "t1" }), hidden)).toBe(true);
  });

  it("mostra tutto quando non ci sono filtri", () => {
    const empty = new Set<string>();
    for (const type of TYPES) expect(isVisible(ev({ type }), empty)).toBe(true);
  });
});
