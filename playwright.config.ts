import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { TEST_ORIGIN, TEST_SESSION_SECRET } from "./tests/e2e/constants";

config({ path: ".local/database.env", quiet: true });
const database = process.env.TEST_DATABASE_URL;
if (
  !database ||
  new URL(database).hostname !== "127.0.0.1" ||
  !new URL(database).pathname.endsWith("_test")
) {
  throw new Error("Browser tests require an isolated local *_test database.");
}

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: TEST_ORIGIN,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "node --import tsx tests/e2e/auth-stub.ts",
      url: "http://127.0.0.1:8788/health",
      reuseExistingServer: false,
      env: { GLOBEALBUM_AUTH_TEST_STUB: "1", TEST_DATABASE_URL: database },
    },
    {
      command: "node --import tsx tests/e2e/storage-stub.ts",
      url: "http://127.0.0.1:8787/health",
      reuseExistingServer: false,
      env: { GLOBEALBUM_STORAGE_TEST_STUB: "1" },
    },
    {
      command: "npm run dev -- --port 3100",
      url: TEST_ORIGIN,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: database,
        DIRECT_URL: database,
        APP_ORIGIN: TEST_ORIGIN,
        NEON_AUTH_BASE_URL: "http://127.0.0.1:8788/auth",
        NEON_AUTH_COOKIE_SECRET: TEST_SESSION_SECRET,
        IMAGE_WORKER_URL: "http://127.0.0.1:8787",
        IMAGE_WORKER_SECRET: TEST_SESSION_SECRET,
        GEONAMES_USERNAME: process.env.GLOBEALBUM_LIVE_GEONAMES_USERNAME ?? "",
        GOOGLE_CLIENT_ID: "local-contract-client.apps.googleusercontent.com",
      },
    },
  ],
});
