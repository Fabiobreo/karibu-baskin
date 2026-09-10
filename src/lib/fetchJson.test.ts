import { describe, it, expect } from "vitest";
import { readError } from "./fetchJson";

function jsonRes(body: unknown, status = 400, statusText = "Bad Request") {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "content-type": "application/json" },
  });
}

function htmlRes(status = 500, statusText = "Internal Server Error") {
  return new Response("<!DOCTYPE html><html><body>Internal Server Error</body></html>", {
    status,
    statusText,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

describe("readError", () => {
  it("usa il messaggio del server quando la risposta è JSON", async () => {
    expect(await readError(jsonRes({ error: "Titolo troppo lungo" }))).toBe("Titolo troppo lungo");
  });

  it("ignora spazi e campi vuoti, ricadendo sullo status", async () => {
    expect(await readError(jsonRes({ error: "   " }))).toBe("Errore 400 (Bad Request)");
    expect(await readError(jsonRes({}))).toBe("Errore 400 (Bad Request)");
    expect(await readError(jsonRes({ error: 42 }))).toBe("Errore 400 (Bad Request)");
  });

  it("non esplode sulle pagine HTML: è il caso che nascondeva l'errore vero", async () => {
    const msg = await readError(htmlRes());
    expect(msg).toBe("Errore 500 (Internal Server Error)");
    expect(msg).not.toContain("<");
    expect(msg).not.toContain("DOCTYPE");
  });

  it("regge un JSON malformato dichiarato come JSON", async () => {
    const res = new Response("{non json", {
      status: 502,
      statusText: "Bad Gateway",
      headers: { "content-type": "application/json" },
    });
    expect(await readError(res)).toBe("Errore 502 (Bad Gateway)");
  });

  it("restituisce il testo semplice quando c'è", async () => {
    const res = new Response("Request Entity Too Large", {
      status: 413,
      statusText: "Payload Too Large",
      headers: { "content-type": "text/plain" },
    });
    expect(await readError(res)).toBe("Request Entity Too Large");
  });

  it("tronca i testi lunghi", async () => {
    const res = new Response("x".repeat(500), {
      status: 500,
      headers: { "content-type": "text/plain" },
    });
    const msg = await readError(res);
    expect(msg.length).toBeLessThanOrEqual(201);
    expect(msg.endsWith("…")).toBe(true);
  });

  it("ricade sullo status con corpo vuoto o senza statusText", async () => {
    expect(await readError(new Response("", { status: 504, statusText: "Gateway Timeout" }))).toBe(
      "Errore 504 (Gateway Timeout)"
    );
    expect(await readError(new Response("", { status: 500, statusText: "" }))).toBe("Errore 500");
  });
});
