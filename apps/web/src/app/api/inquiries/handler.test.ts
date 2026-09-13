import assert from "node:assert/strict";
import test from "node:test";

import { createFormToken } from "../checkout/orders/domain.ts";
import { handleCreateInquiry } from "./handler.ts";

const secret = "test-secret-with-enough-entropy";
const inquiry = {
  customerName: "Анна",
  customerPhone: "+79991234567",
  source: "/tipovye-resheniya",
  modelInterest: "FP115KWH",
  privacyConsent: true as const,
};

test("forwards a valid inquiry to Strapi", async () => {
  let forwarded: Request | undefined;
  const token = createFormToken({ secret, now: 10_000, nonce: "fixed" });
  const response = await handleCreateInquiry(
    new Request("http://local/api/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formToken: token, honeypot: false, inquiry }),
    }),
    {
      now: () => 12_000,
      secret,
      strapiUrl: "http://cms:1337",
      strapiToken: "scoped-storefront-token",
      fetch: async (request) => {
        forwarded = request;
        return Response.json({ data: { id: "inquiry-1" } }, { status: 201 });
      },
    },
  );

  assert.equal(response.status, 201);
  assert.equal(forwarded?.url, "http://cms:1337/api/inquiries");
  assert.equal(
    forwarded?.headers.get("authorization"),
    "Bearer scoped-storefront-token",
  );
  assert.deepEqual(await forwarded?.json(), inquiry);
  assert.deepEqual(await response.json(), { id: "inquiry-1" });
});

test("honeypot and too-fast submissions never reach Strapi", async () => {
  let calls = 0;
  const token = createFormToken({ secret, now: 10_000, nonce: "fixed" });
  const fetch = async () => {
    calls += 1;
    return new Response();
  };

  const honeypot = await handleCreateInquiry(
    new Request("http://local/api/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formToken: token, honeypot: true, inquiry }),
    }),
    { now: () => 12_000, secret, strapiUrl: "http://cms:1337", strapiToken: "t", fetch },
  );
  const tooFast = await handleCreateInquiry(
    new Request("http://local/api/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formToken: token, honeypot: false, inquiry }),
    }),
    { now: () => 10_100, secret, strapiUrl: "http://cms:1337", strapiToken: "t", fetch },
  );

  assert.equal(honeypot.status, 400);
  assert.equal(tooFast.status, 429);
  assert.equal(calls, 0);
});
