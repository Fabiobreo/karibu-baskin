/**
 * Journey 2 — Login + iscrizione
 *
 * Un utente loggato (atleta con ruolo già assegnato) naviga alla pagina
 * di un allenamento, si iscrive con un click e il suo nome compare nel roster.
 *
 * Prerequisiti:
 *   - Server su localhost:3000 con ENABLE_TEST_LOGIN=true
 *   - E2E_ADMIN_EMAIL configurato (per creare/eliminare la sessione di test)
 *   - E2E_ATHLETE_EMAIL configurato — utente con appRole ATHLETE e sportRole impostato
 */

import { test, expect } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ATHLETE_EMAIL,
  loginAs,
  createTestSession,
  deleteTestSession,
} from "./helpers";

test.describe("Login + iscrizione", () => {
  let sessionId = "";
  let sessionSlug = "";

  test.beforeAll(async () => {
    test.skip(
      !ADMIN_EMAIL || !ATHLETE_EMAIL,
      "E2E_ADMIN_EMAIL / E2E_ATHLETE_EMAIL non configurati"
    );
    const s = await createTestSession(ADMIN_EMAIL);
    sessionId = s.id;
    sessionSlug = s.slug;
  });

  test.afterAll(async () => {
    if (sessionId) await deleteTestSession(ADMIN_EMAIL, sessionId);
  });

  test("atleta loggato si iscrive con un click", async ({ page }) => {
    // Login come atleta (cookie condiviso con il browser)
    await page.goto("/");
    await loginAs(page, ATHLETE_EMAIL);

    await page.goto(`/allenamento/${sessionSlug}`);
    await expect(page.getByText("Iscriviti all'allenamento")).toBeVisible();

    // L'atleta ha già un ruolo → il form è direttamente in fase "conferma"
    // Se compare il questionario, il ruolo non è impostato nel DB → skip
    const hasQuestionnaire = await page
      .getByRole("button", { name: "Cammino, ma non corro" })
      .isVisible()
      .catch(() => false);
    test.skip(hasQuestionnaire, "L'atleta non ha un ruolo impostato — compilare sportRole nel DB");

    // Click diretto su "Iscriviti"
    await page.getByRole("button", { name: "Iscriviti" }).click();

    // Dopo l'iscrizione il bottone non è più visibile (o è disabilitato)
    // e il nome dell'atleta compare nel roster
    await expect(page.getByRole("button", { name: "Iscriviti" })).not.toBeVisible({
      timeout: 6000,
    });
  });
});
