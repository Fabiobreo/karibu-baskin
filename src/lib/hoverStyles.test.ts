import { describe, it, expect } from "vitest";
import { onHover } from "./hoverStyles";

const HOVER = "@media (hover: hover)";
const REDUCED = "@media (prefers-reduced-motion: reduce)";

describe("onHover", () => {
  it("racchiude l'effetto in @media (hover: hover)", () => {
    const sx = onHover({ boxShadow: 4 }) as Record<string, Record<string, unknown>>;
    expect(Object.keys(sx)).toEqual([HOVER]);
    expect(sx[HOVER]["&:hover"]).toEqual({ boxShadow: 4 });
  });

  it("annulla i transform con riduci movimento, lasciando il resto", () => {
    const sx = onHover({ transform: "translateY(-2px)", boxShadow: 4 }) as Record<
      string,
      Record<string, Record<string, unknown>>
    >;
    expect(sx[HOVER][REDUCED]).toEqual({ "&:hover": { transform: "none" } });
  });

  it("emette il blocco riduci movimento dopo &:hover, per vincerlo", () => {
    const sx = onHover({ transform: "scale(1.1)" }) as Record<string, Record<string, unknown>>;
    expect(Object.keys(sx[HOVER])).toEqual(["&:hover", REDUCED]);
  });

  it("non aggiunge nulla se non ci sono transform", () => {
    const sx = onHover({ borderColor: "primary.main" }) as Record<string, Record<string, unknown>>;
    expect(Object.keys(sx[HOVER])).toEqual(["&:hover"]);
  });

  it("raggiunge i transform sui discendenti e scarta i rami senza", () => {
    const sx = onHover({
      borderColor: "primary.main",
      "& img": { transform: "scale(1.04)", opacity: 0.9 },
      "& .caption": { color: "text.primary" },
    }) as Record<string, Record<string, Record<string, unknown>>>;
    expect(sx[HOVER][REDUCED]).toEqual({ "&:hover": { "& img": { transform: "none" } } });
  });

  it("non attraversa le funzioni theme-aware", () => {
    const shadow = (theme: { palette: { primary: { main: string } } }) =>
      `0 2px 12px ${theme.palette.primary.main}`;
    const sx = onHover({ boxShadow: shadow, transform: "translateY(-2px)" }) as Record<
      string,
      Record<string, Record<string, unknown>>
    >;
    expect(sx[HOVER][REDUCED]).toEqual({ "&:hover": { transform: "none" } });
    expect(sx[HOVER]["&:hover"].boxShadow).toBe(shadow);
  });
});
