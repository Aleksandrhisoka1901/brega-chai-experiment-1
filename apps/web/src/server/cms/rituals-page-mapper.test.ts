import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchRitualsPageContent,
  ritualsPageRequest,
} from "./rituals-page-mapper.ts";

test("requests the independent published rituals landing content", async () => {
  const request = ritualsPageRequest();
  const url = new URL(request.path, "http://localhost");

  assert.equal(url.pathname, "/api/rituals-page");
  assert.equal(url.searchParams.get("status"), "published");
  assert.deepEqual(request.tags, ["products"]);

  const calls: string[] = [];
  const content = await fetchRitualsPageContent(async (path) => {
    calls.push(path);
    return {
      data: {
        eyebrow: "Глава 02",
        title: "Ритуалы",
        emptyStateText: "Ритуалы скоро появятся.",
        emptyStateLinkLabel: "Вернуться на главную",
        intro: "Готовые чайные сценарии.",
        seo: {
          title: "Чайные ритуалы — Brega Tea",
          description: "Готовые чайные наборы Brega Tea.",
        },
      },
    };
  }, "http://localhost:9000");

  assert.equal(calls.length, 1);
  assert.match(calls[0] ?? "", /^\/api\/rituals-page\?/);
  assert.equal(content.title, "Ритуалы");
  assert.equal(content.intro, "Готовые чайные сценарии.");
});
