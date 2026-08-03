import "server-only";

import {
  collectPublicRuntimeConfig,
  type PublicRuntimeConfigKey,
} from "@/lib/runtime-config";

export const readServerPublicRuntimeConfig = (
  key: PublicRuntimeConfigKey,
  fallback?: string,
) => collectPublicRuntimeConfig(process.env)[key] ?? fallback;

export const publicMediaOrigin = () =>
  readServerPublicRuntimeConfig("NEXT_PUBLIC_MEDIA_URL") ??
  readServerPublicRuntimeConfig("NEXT_PUBLIC_CMS_URL") ??
  "http://localhost:1337";
