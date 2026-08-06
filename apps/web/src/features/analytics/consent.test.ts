import assert from "node:assert/strict";
import test from "node:test";

import { ANALYTICS_CONSENT_VALUES, parseAnalyticsConsent } from "./consent.ts";

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
