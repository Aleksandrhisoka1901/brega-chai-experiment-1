import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";

import {
  assertLocalOrTestEnvironment,
  DEFAULT_ORDER_TOKEN_NAME,
  emitAccessKey,
  ensureOrderCreateToken,
  type ContentApiTokenService,
} from "./order-api-token-helpers.ts";

const require = createRequire(import.meta.url);
const { compileStrapi, createStrapi } =
  require("@strapi/strapi") as typeof import("@strapi/strapi");

assertLocalOrTestEnvironment(process.env.NODE_ENV);

const appContext = await compileStrapi();
const strapi = await createStrapi(appContext).load();

try {
  const service = strapi.service(
    "admin::api-token-content-api",
  ) as unknown as ContentApiTokenService;
  const accessKey = await ensureOrderCreateToken(
    service,
    process.env.ORDER_API_TOKEN_NAME ?? DEFAULT_ORDER_TOKEN_NAME,
  );

  await emitAccessKey(accessKey, process.env.ORDER_API_TOKEN_OUTPUT_FILE, {
    writeFile,
    writeStdout: (data) => process.stdout.write(data),
  });
} finally {
  await strapi.destroy();
}
