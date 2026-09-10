import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

/**
 * Test del form contatti.
 *
 * `/contatti` è l'unico punto di ingresso del sito per chi vuole avvicinarsi
 * all'associazione. Due proprietà contano più delle altre, e sono opposte:
 *  - un messaggio vero non deve mai sparire con una conferma finta (chiave
 *    Resend mancante in produzione);
 *  - un bot che compila il campo trappola deve ricevere una conferma finta, e
 *    nessuna email deve partire.
 */

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  captureMessage: vi.fn(),
  ip: "10.0.0.1",
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": mocks.ip })),
}));

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "it"),
}));

// `contact.ts` fa `new Resend(apiKey)`: serve un costruttore vero. Un'arrow
// function passata a `mockImplementation` non lo è.
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
}));

vi.mock("@/emails/ContactNotificationEmail", () => ({ default: vi.fn(() => null) }));
vi.mock("@/emails/ContactConfirmationEmail", () => ({ default: vi.fn(() => null) }));

import { submitContactForm } from "./contact";

let ipCounter = 0;

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const valid = {
  name: "Giulia Rossi",
  email: "giulia@example.com",
  message: "Mio figlio vorrebbe provare un allenamento, come funziona?",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Il rate limit del form è in memoria e per IP (3 invii ogni 10 minuti): un
  // IP diverso per test li rende indipendenti l'uno dall'altro.
  mocks.ip = `10.0.0.${++ipCounter}`;
  mocks.send.mockResolvedValue({ error: null });
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("NODE_ENV", "production");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("submitContactForm · invio", () => {
  it("invia la notifica alla società e conferma all'utente", async () => {
    const result = await submitContactForm({}, form(valid));
    expect(result).toEqual({ success: true });
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: "giulia@example.com" })
    );
  });

  it("segnala l'errore e avvisa Sentry se Resend rifiuta l'invio", async () => {
    mocks.send.mockResolvedValueOnce({ error: { name: "validation_error", message: "x" } });
    const result = await submitContactForm({}, form(valid));
    expect(result.success).toBeUndefined();
    expect(result.error).toBeTruthy();
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("validation_error"),
      expect.objectContaining({ level: "error" })
    );
  });
});

// Il caso che prima perdeva i messaggi in silenzio.
describe("submitContactForm · chiave Resend mancante", () => {
  it("in produzione restituisce un errore invece di una conferma finta", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await submitContactForm({}, form(valid));
    expect(result.success).toBeUndefined();
    expect(result.error).toBeTruthy();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("in produzione avvisa Sentry con livello fatal", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await submitContactForm({}, form(valid));
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("RESEND_API_KEY"),
      expect.objectContaining({ level: "fatal" })
    );
  });

  it("in sviluppo conferma senza inviare, per poter provare il form in locale", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await submitContactForm({}, form(valid));
    expect(result).toEqual({ success: true });
    expect(mocks.captureMessage).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("submitContactForm · honeypot", () => {
  it("con il campo trappola compilato conferma senza inviare nulla", async () => {
    const result = await submitContactForm({}, form({ ...valid, kbhp: "https://spam.example" }));
    // Conferma finta voluta: segnalare l'errore insegnerebbe al bot il trucco.
    expect(result).toEqual({ success: true });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("ignora un campo trappola composto da soli spazi", async () => {
    const result = await submitContactForm({}, form({ ...valid, kbhp: "   " }));
    expect(result).toEqual({ success: true });
    expect(mocks.send).toHaveBeenCalled();
  });
});

describe("submitContactForm · validazione e limiti", () => {
  it("rifiuta un'email non valida", async () => {
    const result = await submitContactForm({}, form({ ...valid, email: "non-una-email" }));
    expect(result.error).toBeTruthy();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rifiuta un messaggio troppo corto", async () => {
    const result = await submitContactForm({}, form({ ...valid, message: "ciao" }));
    expect(result.error).toBeTruthy();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("al quarto invio dallo stesso IP applica il rate limit", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await submitContactForm({}, form(valid))).toEqual({ success: true });
    }
    // Ogni invio riuscito spedisce due email (notifica e conferma): conta le
    // chiamate in più dopo il quarto invio, non il totale.
    const sentBefore = mocks.send.mock.calls.length;
    const fourth = await submitContactForm({}, form(valid));
    expect(fourth.error).toBeTruthy();
    expect(mocks.send).toHaveBeenCalledTimes(sentBefore);
  });
});
