import { describe, it, expect } from "vitest";
import { lightTheme, darkTheme } from "@/theme";
import { contrastRatio } from "@/lib/colorUtils";
import { TEAM, TEAM_RING } from "@/lib/palette";
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

describe("resa del calendario", () => {
  it("da' a ogni tipo un colore suo, dal tema", () => {
    for (const theme of [lightTheme, darkTheme]) {
      for (const type of TYPES) {
        expect(eventVisual(theme, type).bg).toBe(theme.palette.calendar[type]);
      }
      expect(new Set(TYPES.map((type) => eventVisual(theme, type).bg)).size).toBe(TYPES.length);
    }
  });

  it("tiene il testo sopra il 4,5:1 su ogni chip, nei due temi", () => {
    for (const theme of [lightTheme, darkTheme]) {
      for (const type of TYPES) {
        const { bg, fg } = eventVisual(theme, type);
        // L'etichetta scura e' nero all'87%: si confronta il colore che si vede.
        const seen = fg.startsWith("rgba") ? "#1F1F1F" : fg;
        expect(contrastRatio(bg, seen)!, `${type} ${theme.palette.mode}`).toBeGreaterThanOrEqual(
          4.5
        );
      }
    }
  });

  it("stende fondo e testo del tipo", () => {
    const visual = eventVisual(lightTheme, "training");
    expect(surfaceSx(visual)).toEqual({ bgcolor: visual.bg, color: visual.fg });
  });

  it("porta il colore squadra sulla tinta della palette", () => {
    expect(eventVisual(lightTheme, "training", "blue").accent).toBe(TEAM.blue);
    // Un hex storico si legge sulla tinta del suo settore.
    expect(eventVisual(lightTheme, "match", "#8E24AA").accent).toBe(TEAM.violet);
    // Il colore squadra non tocca mai lo sfondo del tipo.
    expect(eventVisual(lightTheme, "match", "blue").bg).toBe(lightTheme.palette.calendar.match);
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
    // La fascia e l'eco si confrontano col foglio grazie al separatore. L'Oro
    // in chiaro non ci arriva: ha il filo esterno (test sotto).
    for (const theme of [lightTheme, darkTheme]) {
      for (const [tint, hex] of Object.entries(TEAM)) {
        if (tint === "gold" && theme.palette.mode === "light") continue;
        const ratio = contrastRatio(hex, theme.palette.background.paper);
        expect(ratio!, `${hex} in ${theme.palette.mode}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("mette il filo esterno alla fascia oro solo in chiaro", () => {
    expect(decorationSx(lightTheme, { accent: TEAM.gold }).boxShadow).toContain(TEAM_RING);
    expect(decorationSx(darkTheme, { accent: TEAM.gold }).boxShadow).not.toContain(TEAM_RING);
    expect(decorationSx(lightTheme, { accent: TEAM.blue }).boxShadow).not.toContain(TEAM_RING);
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
