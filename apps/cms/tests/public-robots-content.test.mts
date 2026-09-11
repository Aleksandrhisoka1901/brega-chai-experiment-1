import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_ROBOTS_BLOCKED_USER_AGENTS,
  PUBLIC_ROBOTS_SEARCH_CRAWLER_USER_AGENTS,
  publicRobotsContent,
} from "../src/api/robots-txt/public-robots-content.ts";

test("public robots.txt stays within the CMS field limit and keeps search crawlers", () => {
  const content = publicRobotsContent("https://lon-energy.ru");

  assert.equal(content.length <= 20_000, true);
  assert.match(content, /^User-agent: \*\nAllow: \//);
  assert.match(content, /Allow: \/\*\?page=/);
  assert.match(content, /Disallow: \/api\//);
  assert.match(content, /Disallow: \/legal\/privacy\.pdf/);
  assert.match(content, /Host: https:\/\/lon-energy\.ru/);
  assert.match(content, /Sitemap: https:\/\/lon-energy\.ru\/sitemap\.xml/);
  assert.doesNotMatch(content, /Disallow: \/\*%/);
  assert.doesNotMatch(content, /User-agent: Bot\n/);
  assert.doesNotMatch(content, /Disallow: \/legal\/\n/);

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
