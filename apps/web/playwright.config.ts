import { defineConfig, devices } from "@playwright/test";

const cmsFixturePort = Number(process.env.CMS_FIXTURE_PORT ?? 14338);
const webPort = Number(process.env.WEB_E2E_PORT ?? 13000);
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${webPort}`;
const decidedAnalyticsStorageState = {
  cookies: [],
  origins: [
    {
      origin: new URL(baseURL).origin,
      localStorage: [
        {
          name: "brega.analytics-consent.v1",
          value: "rejected",
        },
      ],
    },
  ],
};

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
    baseURL,
    screenshot: "only-on-failure",
    storageState: decidedAnalyticsStorageState,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox-smoke",
      grep: /@smoke/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit-smoke",
      grep: /@smoke/,
      use: { ...devices["Desktop Safari"] },
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
            SITE_URL: `http://127.0.0.1:${webPort}`,
            NEXT_PUBLIC_CMS_URL: `http://127.0.0.1:${cmsFixturePort}`,
            NEXT_PUBLIC_MEDIA_URL: `http://127.0.0.1:${cmsFixturePort}/storefront`,
            HOSTNAME: "0.0.0.0",
            PORT: String(webPort),
          },
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
