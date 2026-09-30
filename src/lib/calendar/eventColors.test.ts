import { describe, it, expect } from "vitest";
import { lightTheme, darkTheme } from "@/theme";
import { contrastRatio } from "@/lib/colorUtils";
import { TEAM } from "@/lib/palette";
import {
  decorationSx,
  echoColor,
  eventVisual,
  surfaceSx,
  teamFilterKey,
  typeFilterKey,
} from "./eventColors";
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

describe("resa del calendario (UX-29)", () => {
  it("distingue i tipi per forma: partita piena, allenamento contornato, evento tenue", () => {
    for (const theme of [lightTheme, darkTheme]) {
      expect(eventVisual(theme, "match").shape).toBe("filled");
      expect(eventVisual(theme, "training").shape).toBe("outlined");
      expect(eventVisual(theme, "event").shape).toBe("tonal");
      const shapes = TYPES.map((type) => eventVisual(theme, type).shape);
      expect(new Set(shapes).size).toBe(TYPES.length);
    }
  });

  it("non usa l'arancio del marchio su nessun chip", () => {
    for (const theme of [lightTheme, darkTheme]) {
      for (const type of TYPES) {
        const v = eventVisual(theme, type);
        for (const c of [v.bg, v.fg, v.border]) {
          expect(c).not.toBe(theme.palette.primary.main);
          expect(c).not.toBe(theme.palette.primary.fill);
        }
      }
    }
  });

  it("la partita e' nel nero del marchio, con testo sopra il 4,5:1", () => {
    for (const theme of [lightTheme, darkTheme]) {
      const { bg, fg } = eventVisual(theme, "match");
      expect(bg).toBe(theme.palette.secondary.main);
      expect(contrastRatio(bg, fg)!).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("il bordo dell'allenamento regge il 3:1 sul foglio", () => {
    for (const theme of [lightTheme, darkTheme]) {
      const { border, fg } = eventVisual(theme, "training");
      expect(border).toBe(theme.palette.text.secondary);
      expect(fg).toBe(theme.palette.text.primary);
      expect(contrastRatio(border!, theme.palette.background.paper)!).toBeGreaterThanOrEqual(3);
    }
  });

  it("stende il bordo solo sul contornato", () => {
    expect(surfaceSx(eventVisual(lightTheme, "training")).border).toBe(
      `1px solid ${lightTheme.palette.text.secondary}`
    );
    expect(surfaceSx(eventVisual(lightTheme, "match")).border).toBe("1px solid transparent");
  });

  it("porta il colore squadra sulla tinta della palette", () => {
    expect(eventVisual(lightTheme, "training", "blue").accent).toBe(TEAM.blue);
    // Un hex storico si legge sulla tinta del suo settore.
    expect(eventVisual(lightTheme, "match", "#8E24AA").accent).toBe(TEAM.violet);
    // Il colore squadra non tocca mai lo sfondo del tipo.
    expect(eventVisual(lightTheme, "match", "blue").bg).toBe(lightTheme.palette.secondary.main);
  });

  it("non inventa una fascia se la squadra manca", () => {
    expect(eventVisual(lightTheme, "event").accent).toBeNull();
    expect(eventVisual(lightTheme, "match", null).accent).toBeNull();
  });

  it("fa l'eco nella tinta della squadra, o nell'inchiostro senza tinta", () => {
    expect(echoColor(lightTheme, eventVisual(lightTheme, "match", "blue"))).toBe(TEAM.blue);
    expect(echoColor(darkTheme, eventVisual(darkTheme, "match"))).toBe(
      darkTheme.palette.text.primary
    );
  });
});

describe("decorazioni del chip", () => {
  it("separa la fascia squadra dal corpo del chip", () => {
    const sx = decorationSx(lightTheme, { accent: TEAM.violet });
    expect(sx.borderLeft).toBe(`5px solid ${TEAM.violet}`);
    expect(sx.boxShadow).toContain(`inset 1px 0 0 ${lightTheme.palette.background.paper}`);
  });

  it("non decora niente quando non c'è squadra né eco", () => {
    expect(decorationSx(lightTheme, {})).toEqual({});
  });

  it("marca gli impegni propri con un'eco staccata dal foglio", () => {
    const sx = decorationSx(lightTheme, { echo: TEAM.blue });
    expect(sx.boxShadow).toBe(
      `0 0 0 1.5px ${lightTheme.palette.background.paper}, 0 0 0 3px ${TEAM.blue}`
    );
  });

  it("tiene ogni tinta squadra sopra il 3:1 sul foglio, in entrambi i temi", () => {
    // La fascia e l'eco si confrontano col foglio grazie al separatore.
    for (const theme of [lightTheme, darkTheme]) {
      for (const hex of Object.values(TEAM)) {
        const ratio = contrastRatio(hex, theme.palette.background.paper);
        expect(ratio!, `${hex} in ${theme.palette.mode}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("combina fascia ed eco in un solo box-shadow", () => {
    // Sono due ombre sulla stessa proprietà: scritte separate, la seconda
    // cancellerebbe la prima.
    const sx = decorationSx(lightTheme, { accent: TEAM.violet, echo: TEAM.violet });
    expect(sx.boxShadow?.split(", ")).toHaveLength(3);
  });
});

describe("filtri della legenda", () => {
  it("tiene distinte due squadre dello stesso colore", () => {
    // Era il bug della chiave `match:<colore>`: due squadre con lo stesso hex
    // condividevano il filtro e sparivano insieme.
    const viola = ev({ id: "a", type: "match", teamId: "t1", teamColor: "violet" });
    const anche = ev({ id: "b", type: "match", teamId: "t2", teamColor: "violet" });
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
