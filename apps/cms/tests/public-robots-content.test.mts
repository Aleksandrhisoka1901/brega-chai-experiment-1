import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_ROBOTS_BLOCKED_USER_AGENTS,
  PUBLIC_ROBOTS_SEARCH_CRAWLER_USER_AGENTS,
  ensurePublicRobotsContent,
  publicRobotsContent,
  shouldSyncPublicRobotsContent,
} from "../src/api/robots-txt/public-robots-content.ts";

test("public robots.txt stays within the CMS field limit and keeps search crawlers", () => {
  const content = publicRobotsContent("https://lon-energy.ru");

  assert.equal(content.length <= 20_000, true);
  assert.match(content, /^User-agent: \*\nAllow: \//);
  assert.match(content, /Allow: \/\*\?page=/);
  assert.match(content, /Disallow: \/api\//);
  assert.match(content, /Disallow: \/legal\/privacy\.pdf/);
  assert.match(content, /User-agent: Yandex\nAllow: \//);
  assert.match(content, /User-agent: YandexAdditionalBot\nAllow: \//);
  assert.match(content, /User-agent: YandexAdditional\nAllow: \//);
  assert.match(
    content,
    /User-agent: Yandex[\s\S]*Clean-param: utm_source&utm_medium/,
  );
  assert.match(content, /Sitemap: https:\/\/lon-energy\.ru\/sitemap\.xml/);
  assert.doesNotMatch(content, /^Host:/m);
  assert.doesNotMatch(content, /Disallow: \/\*\?\*\n/);
  assert.doesNotMatch(content, /Disallow: \/\?utm_/);
  assert.doesNotMatch(content, /Clean-param:.*minPrice/);
  assert.doesNotMatch(content, /User-agent: YandexBot\n/);
  assert.doesNotMatch(content, /Disallow: \/\*%/);
  assert.doesNotMatch(content, /User-agent: Bot\n/);
  assert.doesNotMatch(content, /Disallow: \/legal\/\n/);
  assert.equal(
    content.indexOf("User-agent: YandexAdditionalBot") <
      content.indexOf("User-agent: AhrefsBot"),
    true,
  );

  for (const crawler of PUBLIC_ROBOTS_SEARCH_CRAWLER_USER_AGENTS) {
    const lowerCrawler = crawler.toLowerCase();
    for (const blocked of PUBLIC_ROBOTS_BLOCKED_USER_AGENTS) {
      assert.equal(
        lowerCrawler.includes(blocked.toLowerCase()),
        false,
        `${blocked} would also match ${crawler}`,
      );
    }
  }
});

test("syncs robots.txt only for public hostnames", () => {
  assert.equal(shouldSyncPublicRobotsContent("https://lon-energy.ru"), true);
  assert.equal(shouldSyncPublicRobotsContent("http://localhost:3001"), false);
  assert.equal(shouldSyncPublicRobotsContent("http://127.0.0.1:1337"), false);
  assert.equal(shouldSyncPublicRobotsContent("http://201.24.49.82"), false);
  assert.equal(shouldSyncPublicRobotsContent(""), false);
});

test("writes generated robots.txt when the CMS document is stale", async () => {
  const updates: Array<{ documentId: string; content: string }> = [];
  await ensurePublicRobotsContent(
    {
      documents() {
        return {
          async findFirst() {
            return { documentId: "robots-1", content: "User-agent: *\nDisallow: /\n" };
          },
          async create() {
            throw new Error("unexpected create");
          },
          async update(options) {
            updates.push({
              documentId: options.documentId,
              content: options.data.content,
            });
          },
        };
      },
    },
    "https://lon-energy.ru",
  );

  assert.deepEqual(updates, [
    {
      documentId: "robots-1",
      content: publicRobotsContent("https://lon-energy.ru"),
    },
  ]);
});

test("does not overwrite robots.txt on localhost CMS", async () => {
  let called = false;
  await ensurePublicRobotsContent(
    {
      documents() {
        called = true;
        return {
          async findFirst() {
            return null;
          },
          async create() {},
          async update() {},
        };
      },
    },
    "http://localhost:3001",
  );
  assert.equal(called, false);
});
