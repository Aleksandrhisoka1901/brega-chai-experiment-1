import assert from "node:assert/strict";
import test from "node:test";

import {
  capabilityHasNoPrices,
  CAPABILITY_COLUMNS,
  CAPABILITY_ROWS,
} from "./capability-models.ts";

test("keeps four typical systems without prices", () => {
  assert.equal(CAPABILITY_COLUMNS.length, 4);
  assert.equal(
    CAPABILITY_ROWS.find((row) => row.label === "Ёмкость аккумулятора")
      ?.values[0],
    "115,2 кВт·ч",
  );
  assert.equal(capabilityHasNoPrices(), true);
  assert.equal(
    CAPABILITY_ROWS.some((row) => /цен/i.test(row.label)),
    false,
  );
});
