/**
 * Helpers condivisi per i test E2E.
 *
 * loginAs        — autentica la page via test-login (cookie condiviso con il browser)
 * createTestSession — crea una sessione di test via API admin, restituisce { id, slug }
 * deleteTestSession — elimina la sessione di test via API admin
 * addAnonReg     — aggiunge una registrazione anonima via API (no auth)
 */

import { request, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "karibu-test";
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
export const ATHLETE_EMAIL = process.env.E2E_ATHLETE_EMAIL ?? "";

/**
 * Esegue il test-login per la page data.
 * page.request condivide il cookie jar con il browser → l'utente risulta loggato.
 */
export async function loginAs(page: Page, email: string): Promise<void> {
  const res = await page.request.post("/api/test-login", {
    data: { email, password: TEST_PASSWORD },
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok()) {
    const body = await res.text().catch(() => "");
    throw new Error(`Test login fallito per ${email} (${res.status()}): ${body}`);
  }
}

export interface TestSession {
  id: string;
  /** dateSlug se disponibile, altrimenti id UUID */
  slug: string;
}

/**
 * Crea una sessione di test per il giorno seguente.
 * Usa un APIRequestContext separato (non interferisce con la page corrente).
 */
export async function createTestSession(adminEmail: string): Promise<TestSession> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    await ctx.post("/api/test-login", {
      data: { email: adminEmail, password: TEST_PASSWORD },
      headers: { "Content-Type": "application/json" },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const res = await ctx.post("/api/sessions", {
      data: { title: "[E2E] Allenamento Test", date: tomorrow.toISOString() },
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok()) {
      throw new Error(`Creazione sessione fallita (${res.status()}): ${await res.text()}`);
    }

    const json = (await res.json()) as { id: string; dateSlug: string | null };
    return { id: json.id, slug: json.dateSlug ?? json.id };
  } finally {
    await ctx.dispose();
  }
}

/** Elimina la sessione di test (e le registrazioni in cascade). */
export async function deleteTestSession(adminEmail: string, sessionId: string): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    await ctx.post("/api/test-login", {
      data: { email: adminEmail, password: TEST_PASSWORD },
      headers: { "Content-Type": "application/json" },
    });
    await ctx.delete(`/api/sessions/${sessionId}`);
  } finally {
    await ctx.dispose();
  }
}

/**
 * Aggiunge una registrazione anonima.
 * Passa un IP finto via X-Forwarded-For per evitare il rate limit anonimo (3/min per IP)
 * quando si registrano più atleti in parallelo nello stesso test.
 * In prod Vercel sovrascrive con x-real-ip, quindi questo header non ha effetto.
 */
export async function addAnonReg(
  sessionId: string,
  name: string,
  role: number,
  index = 0
): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    const res = await ctx.post("/api/registrations", {
      data: { sessionId, name, role },
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": `10.0.0.${index + 1}`,
      },
    });
    if (!res.ok()) {
      console.warn(`addAnonReg fallito per ${name}: ${await res.text()}`);
    }
  } finally {
    await ctx.dispose();
  }
}
