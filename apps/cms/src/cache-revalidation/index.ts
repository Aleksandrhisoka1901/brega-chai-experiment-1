import {
  createCacheRevalidationSender,
  type CacheRevalidationSenderOptions,
} from "./sender.js";
import { registerCacheRevalidationSubscriber } from "./subscriber.js";

export type {
  CacheRevalidationSender,
  CacheRevalidationSenderOptions,
  DeliveryResult,
  RevalidationAction,
  RevalidationEvent,
  RevalidationEventName,
  RevalidationPayload,
} from "./sender.js";
export { createCacheRevalidationSender } from "./sender.js";
export { registerCacheRevalidationSubscriber } from "./subscriber.js";

export interface CacheRevalidationEnvironment {
  CACHE_REVALIDATION_URL?: string;
  CACHE_REVALIDATION_SECRET?: string;
  CACHE_REVALIDATION_TIMEOUT_MS?: string;
}

function parseTimeout(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const timeout = Number(value);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : undefined;
}

export function createCacheRevalidationSenderFromEnv(
  env: CacheRevalidationEnvironment,
  overrides: Omit<
    CacheRevalidationSenderOptions,
    "url" | "secret" | "timeoutMs"
  > = {},
) {
  return createCacheRevalidationSender({
    ...overrides,
    url: env.CACHE_REVALIDATION_URL,
    secret: env.CACHE_REVALIDATION_SECRET,
    timeoutMs: parseTimeout(env.CACHE_REVALIDATION_TIMEOUT_MS),
  });
}

export function registerCacheRevalidation(
  strapi: Parameters<typeof registerCacheRevalidationSubscriber>[0],
  env: CacheRevalidationEnvironment = {
    CACHE_REVALIDATION_URL: process.env.CACHE_REVALIDATION_URL,
    CACHE_REVALIDATION_SECRET: process.env.CACHE_REVALIDATION_SECRET,
    CACHE_REVALIDATION_TIMEOUT_MS: process.env.CACHE_REVALIDATION_TIMEOUT_MS,
  },
) {
  return registerCacheRevalidationSubscriber(
    strapi,
    createCacheRevalidationSenderFromEnv(env, { logger: strapi.log }),
  );
}
