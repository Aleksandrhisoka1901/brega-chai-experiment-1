export interface SeedRecord {
  key: string;
}

export interface ExistingSeedRecord {
  key: string;
  documentId: string;
}

export interface SeedOperation<T extends SeedRecord> {
  type: "create" | "update";
  record: T;
  documentId?: string;
}

const ALLOWED_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "postgres",
]);
const ALLOWED_DATABASE_NAMES = new Set(["brega_chai", "brega_chai_test"]);

export const PUBLIC_STOREFRONT_ACTIONS = [
  "api::global-setting.global-setting.find",
  "api::home-page.home-page.find",
  "api::product.product.find",
  "api::product.product.findOne",
  "api::products-page.products-page.find",
] as const;

export function assertSeedAllowed(
  env: Partial<Record<string, string | undefined>>,
): void {
  if (env.SEED_ALLOWED !== "true") {
    throw new Error("Seed requires explicit SEED_ALLOWED=true");
  }

  if (env.NODE_ENV === "production") {
    throw new Error("Seed is disabled when NODE_ENV=production");
  }

  const databaseHost = env.DATABASE_HOST ?? "localhost";
  if (!ALLOWED_DATABASE_HOSTS.has(databaseHost)) {
    throw new Error(`Seed is not allowed for database host "${databaseHost}"`);
  }

  const databaseName = env.DATABASE_NAME ?? "brega_chai";
  if (!ALLOWED_DATABASE_NAMES.has(databaseName)) {
    throw new Error(`Seed is not allowed for database "${databaseName}"`);
  }
}

export function planSeed<T extends SeedRecord>(
  desired: readonly T[],
  existing: readonly ExistingSeedRecord[],
): SeedOperation<T>[] {
  const existingByKey = new Map(existing.map((record) => [record.key, record]));

  return desired.map((record) => {
    const match = existingByKey.get(record.key);

    return match
      ? { type: "update", record, documentId: match.documentId }
      : { type: "create", record };
  });
}
