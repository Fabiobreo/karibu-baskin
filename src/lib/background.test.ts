import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("next/server", () => ({ after: vi.fn() }));

import { after } from "next/server";
import { inBackground } from "./background";

const mockAfter = after as unknown as Mock;
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("inBackground", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockAfter.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("registra la promessa con after()", async () => {
    inBackground(Promise.resolve("ok"), "test");
    expect(mockAfter).toHaveBeenCalledOnce();
    const registered = mockAfter.mock.calls[0][0];
    expect(registered).toBeInstanceOf(Promise);
    await expect(registered).resolves.toBe("ok");
  });

  it("logga l'errore della promessa con l'etichetta e non lo rilancia", async () => {
    const err = new Error("boom");
    inBackground(Promise.reject(err), "push session open");
    const registered = mockAfter.mock.calls[0][0] as Promise<unknown>;
    await expect(registered).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith("[push session open]", err);
  });

  it("fuori da una richiesta (after lancia) non rilancia e logga comunque gli errori", async () => {
    mockAfter.mockImplementation(() => {
      throw new Error("`after` was called outside a request scope");
    });
    const err = new Error("boom");
    expect(() => inBackground(Promise.reject(err), "audit test")).not.toThrow();
    await flush();
    expect(errorSpy).toHaveBeenCalledWith("[audit test]", err);
  });
});
