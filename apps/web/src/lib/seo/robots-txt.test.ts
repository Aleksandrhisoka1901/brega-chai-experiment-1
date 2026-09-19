import assert from "node:assert/strict";
import test from "node:test";

import { publicStorefrontRobots } from "./robots-txt.ts";

test("storefront robots.txt opens Yandex and never uses a site-wide Disallow", () => {
  const content = publicStorefrontRobots("https://lon-energy.ru");

  assert.match(content, /^User-agent: Yandex\nAllow: \//);
  assert.match(content, /User-agent: YandexWebmaster\nAllow: \//);
  assert.match(content, /Clean-param: utm_source&utm_medium/);
  assert.doesNotMatch(content, /^Disallow: \/\s*$/m);
  assert.doesNotMatch(content, /User-agent: AhrefsBot/);
  assert.doesNotMatch(content, /User-agent: YaK\n/);
});
