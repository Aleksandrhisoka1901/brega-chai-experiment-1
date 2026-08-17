import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readWorkflow = (name) =>
  readFileSync(
    new URL(`../.github/workflows/${name}`, import.meta.url),
    "utf8",
  );

const triggerBlock = (workflow) => {
  const start = workflow.indexOf("on:\n");
  const end = workflow.indexOf("\npermissions:", start);

  assert.notEqual(start, -1, "workflow must declare triggers");
  assert.notEqual(end, -1, "workflow trigger block must precede permissions");

  return workflow.slice(start, end);
};

const ci = triggerBlock(readWorkflow("ci.yml"));
const release = readWorkflow("release.yml");

assert.match(ci, /^  pull_request:/m, "CI must validate pull requests");
assert.match(ci, /^  workflow_call:/m, "CI must remain reusable by releases");
assert.doesNotMatch(
  ci,
  /^  push:/m,
  "CI must not repeat the full gate after merging into main",
);
assert.match(
  release,
  /^  push:\n    tags:\n      - release-\*$/m,
  "release workflow must remain limited to release tags",
);
assert.match(
  release,
  /^    uses: \.\/\.github\/workflows\/ci\.yml$/m,
  "release workflow must run the reusable full quality gate",
);

console.log("CI trigger contract passed.");
