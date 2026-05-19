import { defineConfig, devices } from "@playwright/test";

/**
 * Prerequisiti per eseguire i test E2E:
 * - Server in esecuzione su localhost:3000 con ENABLE_TEST_LOGIN=true
 * - Variabili d'ambiente configurate (vedi .env.test.example):
 *   E2E_ADMIN_EMAIL, E2E_ATHLETE_EMAIL, TEST_PASSWORD
 *
 * Localmente (PowerShell):
 *   $env:ENABLE_TEST_LOGIN="true"; npm run dev
 * Localmente (bash/zsh):
 *   ENABLE_TEST_LOGIN=true npm run dev
 * In CI: il webServer viene avviato automaticamente.
 */
export default defineConfig({
  testDir: "./e2e",

  // Test sequenziali per evitare conflitti sul DB condiviso
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [["html", { open: "never" }], ["line"]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Screenshot solo in caso di fallimento
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Avvia automaticamente il server in CI; in locale riusa quello in esecuzione
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ENABLE_TEST_LOGIN: "true",
    },
  },
});
