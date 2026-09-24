import { describe, expect, it } from "vitest";
import { toastAutoHideMs } from "./ToastContext";

describe("toastAutoHideMs", () => {
  it("non chiude mai da soli gli errori", () => {
    expect(toastAutoHideMs({ severity: "error" })).toBeNull();
    expect(toastAutoHideMs({ severity: "error", duration: 3000 })).toBeNull();
  });

  it("tiene gli altri avvisi almeno 6 s", () => {
    expect(toastAutoHideMs({})).toBe(6000);
    expect(toastAutoHideMs({ severity: "success", duration: 2000 })).toBe(6000);
    expect(toastAutoHideMs({ severity: "warning" })).toBe(6000);
  });

  it("rispetta le durate piu' lunghe", () => {
    expect(toastAutoHideMs({ severity: "success", duration: 10_000 })).toBe(10_000);
  });
});
