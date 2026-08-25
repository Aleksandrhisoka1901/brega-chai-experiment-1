export interface SeedRecord {
  key: string;
}

export interface ExistingSeedRecord {
  key: string;
  documentId: string;
  slug?: string;
}

export interface SeedOperation<T extends SeedRecord> {
  type: "create" | "update";
  record: T;
  documentId?: string;
  slug?: string;
}

type SeedArticleImage = {
  type: "seed-image";
  asset: string;
};

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
  "api::rituals-page.rituals-page.find",
  "api::articles-page.articles-page.find",
  "api::article.article.find",
  "api::article.article.findOne",
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
      ? {
          type: "update",
          record,
          documentId: match.documentId,
          ...(match.slug ? { slug: match.slug } : {}),
        }
      : { type: "create", record };
  });
}

export function resolveSeedArticleImages(
  content: readonly unknown[],
  images: ReadonlyMap<string, unknown>,
): unknown[] {
  return content.map((block) => {
    if (
      typeof block !== "object" ||
      block === null ||
      !("type" in block) ||
      block.type !== "seed-image"
    ) {
      return block;
    }

    const reference = block as SeedArticleImage;
    const image = images.get(reference.asset);
    if (!image) {
      throw new Error(
        `Seed article image "${reference.asset}" was not uploaded`,
      );
    }

    return {
      type: "image",
      image,
      children: [{ type: "text", text: "" }],
    };
  });
}

export function alignBetterBlocksImages(
  content: readonly unknown[],
  imageAlign: "left" | "center" | "right",
): unknown[] {
  return content.map((block) => {
    if (
      typeof block !== "object" ||
      block === null ||
      !("type" in block) ||
      block.type !== "image"
    ) {
      return block;
    }

    const image =
      "image" in block &&
      typeof block.image === "object" &&
      block.image !== null
        ? block.image
        : null;
    const caption =
      image && "caption" in image && typeof image.caption === "string"
        ? image.caption
        : undefined;

    return {
      ...block,
      imageAlign,
      ...(caption ? { caption } : {}),
    };
  });
}
