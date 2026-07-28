import { defineConfig, devices } from "@playwright/test";

const cmsFixturePort = Number(process.env.CMS_FIXTURE_PORT ?? 14338);
const webPort = Number(process.env.WEB_E2E_PORT ?? 13000);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["dot"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],
  use: {
    baseURL: process.env.BASE_URL ?? `http://127.0.0.1:${webPort}`,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : [
        {
          command: "node tests/fixtures/product-cms.mjs",
          port: cmsFixturePort,
          env: {
            ...process.env,
            CMS_FIXTURE_PORT: String(cmsFixturePort),
          },
          reuseExistingServer: false,
          timeout: 30_000,
        },
        {
          command: "yarn test:e2e:server",
          url: `http://127.0.0.1:${webPort}`,
          env: {
            ...process.env,
            CMS_INTERNAL_URL: `http://127.0.0.1:${cmsFixturePort}`,
            CHECKOUT_FORM_SECRET:
              "e2e-checkout-form-secret-with-enough-entropy",
            STRAPI_ORDER_TOKEN: "e2e-scoped-order-token",
            HOSTNAME: "0.0.0.0",
            PORT: String(webPort),
          },
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
