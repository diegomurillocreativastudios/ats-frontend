import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
const devPort = new URL(baseURL).port || "3000"
const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? ""

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: skipWebServer
    ? undefined
    : {
        // CI builds first (`npm run build`); production server is more stable than `next dev`.
        command: process.env.CI
          ? `npm run start -- -p ${devPort}`
          : `npm run dev -- -p ${devPort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          PORT: devPort,
          NEXT_PUBLIC_API_URL: backendUrl,
          API_URL: process.env.API_URL ?? backendUrl,
        },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
