import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// E2E_DEV=1 runs against `next dev` (compiles only the visited routes). Default is a production build.
const DEV = process.env.E2E_DEV === "1";

export default defineConfig({
  testDir: "./e2e",
  // macOS writes "._" metadata files next to edited files on non-Apple drives. They are not tests.
  testIgnore: "**/._*",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: DEV ? 120_000 : 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Answer the cookie banner up front so it does not cover the page. e2e/site.spec.ts tests the banner itself.
    storageState: {
      cookies: [],
      origins: [{ origin: `http://localhost:${PORT}`, localStorage: [{ name: "fiixbe-analytics-consent", value: "denied" }] }],
    },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: DEV ? `next dev -p ${PORT}` : `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
