import { describe, it, expect } from "vitest";
import { sanitizePostHtml } from "./sanitizeHtml";

describe("sanitizePostHtml", () => {
  it("mantiene il markup dell'editor", () => {
    const html =
      "<p>Ciao <strong>mondo</strong></p><ul><li>uno</li></ul><blockquote>cit</blockquote>";
    expect(sanitizePostHtml(html)).toBe(html);
  });

  it("rimuove script e handler inline", () => {
    expect(sanitizePostHtml('<p onclick="alert(1)">x</p><script>alert(1)</script>')).toBe(
      "<p>x</p>"
    );
  });

  it("scarta i link con schema javascript:", () => {
    expect(sanitizePostHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
  });

  it("aggiunge rel ai link e conserva href http", () => {
    const out = sanitizePostHtml('<a href="https://esempio.it" target="_blank">x</a>');
    expect(out).toContain('href="https://esempio.it"');
    expect(out).toContain("noopener");
  });

  it("rimuove iframe e img non previsti dall'editor", () => {
    expect(sanitizePostHtml('<iframe src="https://x.it"></iframe><img src="x.png">')).toBe("");
  });
});
