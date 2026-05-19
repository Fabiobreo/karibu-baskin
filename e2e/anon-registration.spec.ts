/**
 * Journey 1 — Iscrizione anonima
 *
 * Un utente non loggato naviga alla pagina di un allenamento,
 * compila il form con nome e ruolo, si iscrive e il suo nome
 * compare nella lista iscritti.
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

  test("nome compare nel roster dopo iscrizione anonima", async ({ page }) => {
    const testName = "Mario Rossi E2E";

    await page.goto(`/allenamento/${sessionSlug}`);

    // Attende che il form sia visibile
    await expect(page.getByText("Iscriviti all'allenamento")).toBeVisible();

    // ── Questionario ruolo ────────────────────────────────────────────────────
    // Percorso più breve: "Cammino, ma non corro" → "No" → ruolo 2
    await page.getByRole("button", { name: "Cammino, ma non corro" }).click();
    await page.getByRole("button", { name: "No" }).first().click();

    // ── Fase conferma ──────────────────────────────────────────────────────────
    // Il form mostra la fase di conferma con il campo nome
    await expect(page.getByLabel("Nome e cognome")).toBeVisible();
    await page.getByLabel("Nome e cognome").fill(testName);

    // Invia
    await page.getByRole("button", { name: "Iscriviti" }).click();

    // ── Verifica roster ───────────────────────────────────────────────────────
    await expect(page.getByText(testName)).toBeVisible({ timeout: 8000 });
  });
});
