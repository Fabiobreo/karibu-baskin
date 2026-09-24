import { describe, expect, it } from "vitest";
import { isPlainAnchorHref } from "./linkTarget";

describe("isPlainAnchorHref", () => {
  it("usa next/link per le pagine interne", () => {
    expect(isPlainAnchorHref("/")).toBe(false);
    expect(isPlainAnchorHref("/squadre/archivio")).toBe(false);
    expect(isPlainAnchorHref("/marcatori?season=2025-26")).toBe(false);
    expect(isPlainAnchorHref("/contatti#suggerimenti")).toBe(false);
    expect(isPlainAnchorHref("#sezione")).toBe(false);
    expect(isPlainAnchorHref("/apiario")).toBe(false);
  });

  it("usa un'ancora semplice per URL esterni e schemi", () => {
    expect(isPlainAnchorHref("https://instagram.com/karibu")).toBe(true);
    expect(isPlainAnchorHref("http://example.com")).toBe(true);
    expect(isPlainAnchorHref("//cdn.example.com/x.png")).toBe(true);
    expect(isPlainAnchorHref("mailto:info@example.com")).toBe(true);
    expect(isPlainAnchorHref("tel:+390000000")).toBe(true);
    expect(isPlainAnchorHref("webcal://example.com/cal.ics")).toBe(true);
  });

  it("usa un'ancora semplice per le rotte API", () => {
    expect(isPlainAnchorHref("/api/calendar/export.ics")).toBe(true);
    expect(isPlainAnchorHref("/api/admin/export?type=csv")).toBe(true);
  });

  it("usa un'ancora semplice con download", () => {
    expect(isPlainAnchorHref("/file", true)).toBe(true);
    expect(isPlainAnchorHref("/file", "")).toBe(true);
    expect(isPlainAnchorHref("/file", "nome.csv")).toBe(true);
    expect(isPlainAnchorHref("/file", false)).toBe(false);
  });
});
