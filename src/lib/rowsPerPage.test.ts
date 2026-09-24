import { describe, it, expect } from "vitest";
import { parseRowsPerPage, rowsPerPageCookieName } from "@/lib/rowsPerPage";

describe("parseRowsPerPage", () => {
  const options = [10, 25, 50, 100];

  it("usa il valore salvato se è tra le opzioni", () => {
    expect(parseRowsPerPage("50", options, 25)).toBe(50);
  });

  it("ricade sul default senza cookie", () => {
    expect(parseRowsPerPage(undefined, options, 25)).toBe(25);
  });

  it("ignora valori fuori dalle opzioni o non numerici", () => {
    expect(parseRowsPerPage("37", options, 25)).toBe(25);
    expect(parseRowsPerPage("1000", options, 25)).toBe(25);
    expect(parseRowsPerPage("abc", options, 25)).toBe(25);
    expect(parseRowsPerPage("", options, 25)).toBe(25);
  });
});

describe("rowsPerPageCookieName", () => {
  it("un cookie per tabella", () => {
    expect(rowsPerPageCookieName("users")).toBe("karibu-rows-users");
    expect(rowsPerPageCookieName("matches")).not.toBe(rowsPerPageCookieName("events"));
  });
});
