import { describe, it, expect } from "vitest";
import { formatRoleNumbers } from "./roleList";

describe("formatRoleNumbers", () => {
  it("usa la congiunzione italiana", () => {
    expect(formatRoleNumbers([1, 5], "it")).toBe("1 e 5");
    expect(formatRoleNumbers([1, 3, 5], "it")).toBe("1, 3 e 5");
  });

  it("usa la congiunzione inglese", () => {
    expect(formatRoleNumbers([1, 5], "en")).toBe("1 and 5");
    expect(formatRoleNumbers([1, 3, 5], "en")).toBe("1, 3, and 5");
  });

  it("con un solo ruolo restituisce il numero secco", () => {
    expect(formatRoleNumbers([4], "it")).toBe("4");
  });

  it("ordina i ruoli", () => {
    expect(formatRoleNumbers([5, 1, 3], "it")).toBe("1, 3 e 5");
  });

  it("con l'elenco vuoto non produce niente", () => {
    expect(formatRoleNumbers([], "it")).toBe("");
  });
});
