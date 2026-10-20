import { describe, it, expect } from "vitest";
import { groupReference, roleGroupOf, tercileThresholds } from "./roleGroups";

describe("roleGroupOf", () => {
  it("ruoli 1 e 2 stanno insieme", () => {
    expect(roleGroupOf(1)).toBe("1-2");
    expect(roleGroupOf(2)).toBe("1-2");
  });

  it("3, 4 e 5 hanno il loro gruppo", () => {
    expect(roleGroupOf(3)).toBe("3");
    expect(roleGroupOf(5)).toBe("5");
  });

  it("senza ruolo o ruolo fuori scala → none", () => {
    expect(roleGroupOf(null)).toBe("none");
    expect(roleGroupOf(7)).toBe("none");
  });
});

describe("groupReference", () => {
  it("media del gruppo con almeno 3 curve leggibili", () => {
    expect(groupReference([20, 22, 24], 30)).toEqual({ value: 22, own: true });
  });

  it("con meno di 3 curve ripiega sulla media della rosa", () => {
    expect(groupReference([20, 22], 30)).toEqual({ value: 30, own: false });
  });
});

describe("tercileThresholds", () => {
  it("terzili sui valori ordinati", () => {
    expect(tercileThresholds([9, 1, 5, 3, 7, 2])).toEqual({ lo: 3, hi: 7 });
  });

  it("meno di 3 valori → null", () => {
    expect(tercileThresholds([1, 2])).toBeNull();
  });
});
