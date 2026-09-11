import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYTICS_CONSENT_VALUES,
  parseAnalyticsConsent,
  shouldLoadAnalytics,
} from "./consent.ts";

test("accepts only known analytics consent values", () => {
  assert.equal(
    parseAnalyticsConsent(ANALYTICS_CONSENT_VALUES.accepted),
    ANALYTICS_CONSENT_VALUES.accepted,
  );
  assert.equal(
    parseAnalyticsConsent(ANALYTICS_CONSENT_VALUES.rejected),
    ANALYTICS_CONSENT_VALUES.rejected,
  );
  assert.equal(parseAnalyticsConsent(null), null);
  assert.equal(parseAnalyticsConsent("true"), null);
  assert.equal(parseAnalyticsConsent("accepted-v0"), null);
});

test("loads analytics on production builds and public hostnames", () => {
  assert.equal(
    shouldLoadAnalytics({ hostname: "127.0.0.1", nodeEnv: "production" }),
    true,
  );
  assert.equal(
    shouldLoadAnalytics({ hostname: "lon-energy.ru", nodeEnv: "development" }),
    true,
  );
  assert.equal(
    shouldLoadAnalytics({ hostname: "localhost", nodeEnv: "development" }),
    false,
  );
  assert.equal(
    shouldLoadAnalytics({ hostname: "127.0.0.1", nodeEnv: "development" }),
    false,
  );
});
