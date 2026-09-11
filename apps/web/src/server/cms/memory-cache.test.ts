import assert from "node:assert/strict";
import test from "node:test";

import {
  invalidateCmsMemoryCache,
  readCmsMemoryCache,
  shouldUseCmsMemoryCache,
  withCmsInFlight,
  writeCmsMemoryCache,
} from "./memory-cache.ts";

test("uses an in-process CMS cache only on the public site origin", () => {
  assert.equal(shouldUseCmsMemoryCache("http://localhost:3000"), false);
  assert.equal(shouldUseCmsMemoryCache("http://127.0.0.1:3000"), false);
  assert.equal(shouldUseCmsMemoryCache("https://lon-energy.ru"), true);
});

test("dedupes concurrent CMS reads and can drop tagged entries", async () => {
  const originalSiteUrl = process.env.SITE_URL;
  process.env.SITE_URL = "https://lon-energy.ru";
  invalidateCmsMemoryCache();

  try {
    let loads = 0;
    const first = withCmsInFlight("/api/global-setting", async () => {
      loads += 1;
      await Promise.resolve();
      return { ok: true };
    });
    const second = withCmsInFlight("/api/global-setting", async () => {
      loads += 1;
      return { ok: false };
    });

    assert.deepEqual(await Promise.all([first, second]), [
      { ok: true },
      { ok: true },
    ]);
    assert.equal(loads, 1);

    writeCmsMemoryCache("/api/global-setting", ["global"], 300, { ok: true });
    writeCmsMemoryCache("/api/products", ["products"], 300, { count: 8 });
    writeCmsMemoryCache("/api/robots-txt", ["robots"], 0, { skip: true });

    assert.deepEqual(readCmsMemoryCache("/api/global-setting"), { ok: true });
    assert.equal(readCmsMemoryCache("/api/robots-txt"), undefined);

    invalidateCmsMemoryCache("global");
    assert.equal(readCmsMemoryCache("/api/global-setting"), undefined);
    assert.deepEqual(readCmsMemoryCache("/api/products"), { count: 8 });
  } finally {
    invalidateCmsMemoryCache();
    if (originalSiteUrl === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = originalSiteUrl;
  }
});
