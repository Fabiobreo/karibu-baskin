import { vi, describe, it, expect } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: { suggestion: { findMany: vi.fn() } } }));

import { loadMySuggestions } from "./mySuggestions";
import { prisma } from "@/lib/db";

describe("loadMySuggestions", () => {
  it("legge solo le risposte, mai le note interne né chi le ha scritte", async () => {
    const findMany = (prisma as unknown as { suggestion: { findMany: Mock } }).suggestion.findMany;
    findMany.mockResolvedValue([]);
    await loadMySuggestions("u1");
    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "u1" });
    expect(args.select.notes.where).toEqual({ isReply: true });
    expect(args.select.notes.select).not.toHaveProperty("author");
    expect(args.select.notes.select).not.toHaveProperty("authorId");
    expect(args.select).not.toHaveProperty("status");
  });
});
