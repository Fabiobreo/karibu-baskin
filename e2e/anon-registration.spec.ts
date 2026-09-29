/**
 * Journey 1 — Iscrizione anonima
 *
 * Un utente non loggato naviga alla pagina di un allenamento, sceglie
 * "Continua senza account", compila nome e questionario e si iscrive; la
 * lista iscritti (senza nomi, non è tesserato) conta la sua iscrizione.
 *
 * Prerequisiti:
 *   - Server su localhost:3000 con ENABLE_TEST_LOGIN=true
 *   - E2E_ADMIN_EMAIL configurato (per creare/eliminare la sessione di test)
 */

import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, createTestSession, deleteTestSession } from "./helpers";

test.describe("Iscrizione anonima", () => {
  let sessionId = "";
  let sessionSlug = "";

  test.beforeAll(async () => {
    test.skip(!ADMIN_EMAIL, "E2E_ADMIN_EMAIL non configurato — test saltato");
    const s = await createTestSession(ADMIN_EMAIL);
    sessionId = s.id;
    sessionSlug = s.slug;
  });

  test.afterAll(async () => {
    if (sessionId) await deleteTestSession(ADMIN_EMAIL, sessionId);
  });

  test("un solo invito ad accedere, con ritorno alla pagina", async ({ page }) => {
    await page.goto(`/allenamento/${sessionSlug}`);
    await expect(page.getByText("Iscriviti all'allenamento")).toBeVisible();

    // UX-34: la scelta in cima al form è l'unico "Accedi" della pagina
    // (la card Iscritti non ha più il suo bottone).
    const login = page.getByRole("link", { name: /^Accedi/ });
    await expect(login).toHaveCount(1);
    await expect(login).toHaveAttribute(
      "href",
      `/login?callbackUrl=${encodeURIComponent(`/allenamento/${sessionSlug}`)}`
    );
    await expect(page.getByText("I nomi li vedono solo i tesserati del Karibu")).toBeVisible();
  });

  test("iscrizione senza account", async ({ page }) => {
    const testName = "Mario Rossi E2E";

    await page.goto(`/allenamento/${sessionSlug}`);
    await expect(page.getByText("Iscriviti all'allenamento")).toBeVisible();

    // ── Scelta: senza account ─────────────────────────────────────────────────
    await page.getByRole("button", { name: /Continua senza account/ }).click();
    await expect(page.getByLabel("Nome e cognome")).toBeFocused();
    await page.getByLabel("Nome e cognome").fill(testName);

    // Un solo testo introduttivo al questionario
    await expect(page.getByText(/Rispondi a qualche domanda/)).toHaveCount(1);

    // ── Questionario ruolo ────────────────────────────────────────────────────
    // Percorso più breve: "Cammino, ma non corro" → "No" → ruolo 2
    await page.getByRole("button", { name: "Cammino, ma non corro" }).click();
    await page.getByRole("button", { name: "No" }).first().click();

    // Invia
    await page.getByRole("button", { name: "Iscriviti", exact: true }).click();

    // ── Verifica ──────────────────────────────────────────────────────────────
    // Chi non è tesserato non vede i nomi: basta il conteggio.
    await expect(page.getByText("1 atleta")).toBeVisible({ timeout: 8000 });
  });
});
