import assert from "node:assert/strict";
import test from "node:test";

import { versionCmsMediaUrl } from "./media-url.ts";

test("versions relative and absolute CMS media URLs with the parent updatedAt", () => {
  const updatedAt = "2026-08-16T12:34:56.000Z";
  const relative = versionCmsMediaUrl(
    "/storefront/tea.png?variant=large",
    "https://media.bregalliance.ru",
    updatedAt,
  );
  const absolute = versionCmsMediaUrl(
    "https://media.bregalliance.ru/storefront/tea.png",
    "https://ignored.example",
    updatedAt,
  );

  assert.equal(new URL(relative).searchParams.get("variant"), "large");
  assert.equal(new URL(relative).searchParams.get("v"), updatedAt);
  assert.equal(new URL(absolute).searchParams.get("v"), updatedAt);
});

test("leaves non-network image URLs unchanged", () => {
  const dataUrl = "data:image/png;base64,AAAA";

  assert.equal(
    versionCmsMediaUrl(dataUrl, "https://media.bregalliance.ru", "2026-08-16"),
    dataUrl,
  );
});
