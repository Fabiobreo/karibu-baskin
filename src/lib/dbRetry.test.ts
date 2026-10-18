import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { isTransientDbError, withDbRetry } from "./dbRetry";

const unreachable = () =>
  new Prisma.PrismaClientInitializationError("Can't reach db", "6.5.0", "P1001");

describe("isTransientDbError", () => {
  it("riconosce P1001 (server irraggiungibile)", () => {
    expect(isTransientDbError(unreachable())).toBe(true);
  });

  it("riconosce un errore di inizializzazione senza codice", () => {
    expect(isTransientDbError(new Prisma.PrismaClientInitializationError("boom", "6.5.0"))).toBe(
      true
    );
  });

  it("non tratta come transitorio un errore di query (P2002)", () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "6.5.0",
    });
    expect(isTransientDbError(duplicate)).toBe(false);
  });

  it("non tratta come transitorio un errore generico", () => {
    expect(isTransientDbError(new Error("qualcosa"))).toBe(false);
    expect(isTransientDbError(null)).toBe(false);
  });
});

describe("withDbRetry", () => {
  it("non riprova se la prima chiamata va a buon fine", async () => {
    const op = vi.fn().mockResolvedValue("ok");
    await expect(withDbRetry(op)).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("riprova su errore di connessione e restituisce il secondo risultato", async () => {
    const op = vi.fn().mockRejectedValueOnce(unreachable()).mockResolvedValue("ok");
    await expect(withDbRetry(op, { delayMs: 1 })).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("propaga subito un errore di query, senza ritentare", async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "6.5.0",
    });
    const op = vi.fn().mockRejectedValue(duplicate);
    await expect(withDbRetry(op, { delayMs: 1 })).rejects.toBe(duplicate);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("esauriti i tentativi rilancia l'ultimo errore", async () => {
    const err = unreachable();
    const op = vi.fn().mockRejectedValue(err);
    await expect(withDbRetry(op, { attempts: 3, delayMs: 1 })).rejects.toBe(err);
    expect(op).toHaveBeenCalledTimes(3);
  });

  it("su una connessione chiusa (P1017) insiste di più: fallisce subito e costa poco", async () => {
    const closed = () =>
      new Prisma.PrismaClientKnownRequestError("Server has closed the connection.", {
        code: "P1017",
        clientVersion: "6.5.0",
      });
    const op = vi
      .fn()
      .mockRejectedValueOnce(closed())
      .mockRejectedValueOnce(closed())
      .mockRejectedValueOnce(closed())
      .mockResolvedValue("ok");
    await expect(withDbRetry(op, { delayMs: 1 })).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(4);
  });

  it("un server irraggiungibile resta a due tentativi (ognuno aspetta il timeout)", async () => {
    const op = vi.fn().mockRejectedValue(unreachable());
    await expect(withDbRetry(op, { delayMs: 1 })).rejects.toBeInstanceOf(
      Prisma.PrismaClientInitializationError
    );
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("un solo tentativo resta uno solo, anche su connessione chiusa", async () => {
    const closed = new Prisma.PrismaClientKnownRequestError("closed", {
      code: "P1017",
      clientVersion: "6.5.0",
    });
    const op = vi.fn().mockRejectedValue(closed);
    await expect(withDbRetry(op, { attempts: 1, delayMs: 1 })).rejects.toBe(closed);
    expect(op).toHaveBeenCalledTimes(1);
  });
});
