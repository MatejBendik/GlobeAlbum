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
  webServer: {
    command: "npm run dev -- --port 3100",
    url: TEST_ORIGIN,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: database,
      DIRECT_URL: database,
      BETTER_AUTH_URL: TEST_ORIGIN,
      BETTER_AUTH_SECRET: TEST_SESSION_SECRET,
      GOOGLE_CLIENT_ID: "browser-test.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "browser-test-only-not-an-oauth-credential",
      IMAGE_WORKER_URL: "http://127.0.0.1:8787",
      IMAGE_WORKER_SECRET: TEST_SESSION_SECRET,
      GEONAMES_USERNAME: "",
    },
  },
});
