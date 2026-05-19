/**
 * Journey 3 — Admin genera squadre
 *
 * Un admin naviga alla pagina di un allenamento con almeno 4 atleti iscritti,
 * clicca "Crea squadre" e le squadre compaiono correttamente.
 *
 * Prerequisiti:
 *   - Server su localhost:3000 con ENABLE_TEST_LOGIN=true
 *   - E2E_ADMIN_EMAIL configurato
 */

import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, loginAs, createTestSession, deleteTestSession, addAnonReg } from "./helpers";

// Atleti di test con ruoli diversi (ruolo 3, 4, 5 = giocatori abili)
const TEST_ATHLETES = [
  { name: "E2E Atleta Uno", role: 3 },
  { name: "E2E Atleta Due", role: 4 },
  { name: "E2E Atleta Tre", role: 5 },
  { name: "E2E Atleta Quattro", role: 3 },
  { name: "E2E Atleta Cinque", role: 4 },
  { name: "E2E Atleta Sei", role: 5 },
];

test.describe("Admin genera squadre", () => {
  let sessionId = "";
  let sessionSlug = "";

  test.beforeAll(async () => {
    test.skip(!ADMIN_EMAIL, "E2E_ADMIN_EMAIL non configurato — test saltato");

    const s = await createTestSession(ADMIN_EMAIL);
    sessionId = s.id;
    sessionSlug = s.slug;

    // Aggiunge 6 iscrizioni anonime in parallelo (index → X-Forwarded-For diverso per evitare rate limit)
    await Promise.all(TEST_ATHLETES.map((a, i) => addAnonReg(sessionId, a.name, a.role, i)));
  });

  test.afterAll(async () => {
    if (sessionId) await deleteTestSession(ADMIN_EMAIL, sessionId);
  });

  test("admin crea le squadre e le vede nella pagina", async ({ page }) => {
    // Login come admin
    await page.goto("/");
    await loginAs(page, ADMIN_EMAIL);

    await page.goto(`/allenamento/${sessionSlug}`);

    // Attende il caricamento della sezione squadre
    await expect(page.getByText("Crea le squadre")).toBeVisible({ timeout: 10_000 });

    // Click "Crea squadre"
    await page.getByRole("button", { name: "Crea squadre" }).click();

    // Attende che le squadre vengano generate e mostrate
    // Il componente TeamDisplay mostra i nomi degli atleti per team
    await expect(page.getByText("E2E Atleta Uno")).toBeVisible({ timeout: 15_000 });

    // Verifica che siano presenti almeno due sezioni di squadra (Arancioni / Neri)
    await expect(page.getByRole("heading", { name: "Arancioni" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Neri" })).toBeVisible();
  });
});
