export const PUBLIC_RUNTIME_CONFIG_KEYS = [
  "SITE_URL",
  "NEXT_PUBLIC_CMS_URL",
  "NEXT_PUBLIC_MEDIA_URL",
] as const;

export type PublicRuntimeConfigKey =
  (typeof PUBLIC_RUNTIME_CONFIG_KEYS)[number];
export type PublicRuntimeConfig = Partial<
  Record<PublicRuntimeConfigKey, string>
>;

declare global {
  interface Window {
    __APP_CONFIG__?: PublicRuntimeConfig;
  }
}

const isPublicHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
};

export const collectPublicRuntimeConfig = (
  environment: Record<string, string | undefined>,
): PublicRuntimeConfig => {
  const config: PublicRuntimeConfig = {};

  for (const key of PUBLIC_RUNTIME_CONFIG_KEYS) {
    const value = environment[key];
    if (!value) continue;
    if (!isPublicHttpUrl(value)) {
      throw new Error(`Invalid public runtime URL: ${key}`);
    }
    config[key] = value;
  }

  return config;
};

export const createRuntimeConfigScript = (config: PublicRuntimeConfig) =>
  `window.__APP_CONFIG__=${JSON.stringify(config)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")};`;

export const readPublicRuntimeConfig = (
  key: PublicRuntimeConfigKey,
  fallback?: string,
  config = typeof window === "undefined" ? undefined : window.__APP_CONFIG__,
) => config?.[key] ?? fallback;
