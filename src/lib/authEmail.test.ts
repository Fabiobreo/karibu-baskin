import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  localeFromRequest,
  magicLinkSubject,
  sendMagicLinkEmail,
  MAGIC_LINK_MAX_AGE_SECONDS,
} from "./authEmail";
import type { EmailProviderSendVerificationRequestParams } from "@auth/core/providers/email";

function reqWithCookie(cookie?: string): Request {
  return new Request("https://karibubaskin.it/api/auth/signin/resend", {
    headers: cookie ? { cookie } : {},
  });
}

/** Params minimi accettati da sendMagicLinkEmail (usa solo identifier/url/request). */
function params(identifier: string, request?: Request) {
  return {
    identifier,
    url: "https://karibubaskin.it/api/auth/callback/resend?token=abc",
    request: request ?? reqWithCookie(),
  } as unknown as EmailProviderSendVerificationRequestParams;
}

describe("localeFromRequest", () => {
  it("torna la lingua di default senza cookie", () => {
    expect(localeFromRequest(reqWithCookie())).toBe("it");
  });

  it("legge la lingua dal cookie next-intl", () => {
    expect(localeFromRequest(reqWithCookie("karibu-locale=en"))).toBe("en");
  });

  it("trova il cookie anche in mezzo ad altri", () => {
    expect(localeFromRequest(reqWithCookie("foo=1; karibu-locale=en; bar=2"))).toBe("en");
  });

  it("ignora un valore di lingua non valido", () => {
    expect(localeFromRequest(reqWithCookie("karibu-locale=de"))).toBe("it");
  });

  it("non esplode se la request manca", () => {
    expect(localeFromRequest(undefined)).toBe("it");
  });
});

describe("magicLinkSubject", () => {
  it("è localizzato", () => {
    expect(magicLinkSubject("it")).toContain("link di accesso");
    expect(magicLinkSubject("en")).toContain("sign-in link");
  });
});

describe("MAGIC_LINK_MAX_AGE_SECONDS", () => {
  it("vale 24 ore", () => {
    expect(MAGIC_LINK_MAX_AGE_SECONDS).toBe(86_400);
  });
});

describe("sendMagicLinkEmail", () => {
  const origKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (origKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = origKey;
    // NODE_ENV viene ripristinato da unstubAllEnvs (è read-only, non assegnabile).
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("in sviluppo senza Resend logga il link invece di fallire", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await expect(sendMagicLinkEmail(params("dev-fallback@example.com"))).resolves.toBeUndefined();
    expect(console.log).toHaveBeenCalled();
  });

  it("in produzione senza Resend fallisce esplicitamente", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(sendMagicLinkEmail(params("prod-nokey@example.com"))).rejects.toThrow(
      /RESEND_API_KEY/
    );
  });

  it("blocca il flooding della stessa casella dopo 5 richieste", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const email = "flood-target@example.com";
    for (let i = 0; i < 5; i++) {
      await expect(sendMagicLinkEmail(params(email))).resolves.toBeUndefined();
    }
    await expect(sendMagicLinkEmail(params(email))).rejects.toThrow(/Troppe richieste/);
  });

  it("il rate limit è per indirizzo, non globale", async () => {
    vi.stubEnv("NODE_ENV", "development");
    for (let i = 0; i < 5; i++) {
      await sendMagicLinkEmail(params("busy-mailbox@example.com"));
    }
    await expect(sendMagicLinkEmail(params("other-person@example.com"))).resolves.toBeUndefined();
  });

  it("normalizza l'indirizzo prima di contare le richieste", async () => {
    vi.stubEnv("NODE_ENV", "development");
    for (let i = 0; i < 5; i++) {
      await sendMagicLinkEmail(params("  Mixed.Case@Example.com  "));
    }
    await expect(sendMagicLinkEmail(params("mixed.case@example.com"))).rejects.toThrow(
      /Troppe richieste/
    );
  });
});
