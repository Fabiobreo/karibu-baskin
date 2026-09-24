import { describe, expect, it } from "vitest";
import { isAdminPath } from "./HideInAdmin";

describe("isAdminPath", () => {
  it("riconosce il pannello admin", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/utenti")).toBe(true);
    expect(isAdminPath("/admin/partite/abc/statistiche")).toBe(true);
  });

  it("lascia stare le pagine pubbliche", () => {
    expect(isAdminPath("/")).toBe(false);
    expect(isAdminPath("/sponsor")).toBe(false);
    expect(isAdminPath("/administration")).toBe(false);
    expect(isAdminPath(null)).toBe(false);
  });
});
