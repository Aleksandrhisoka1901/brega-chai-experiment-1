import type { OrderResult } from "@brega-chai/contracts";

type PathType = "layout" | "page";

export interface OrderStockInvalidationDependencies {
  revalidatePath(path: string, type?: PathType): void;
  revalidateTag(tag: string): void;
}

export function invalidateOrderStock(
  order: OrderResult,
  dependencies: OrderStockInvalidationDependencies,
) {
  dependencies.revalidateTag("products");
  dependencies.revalidatePath("/", "page");
  dependencies.revalidatePath("/tovary", "page");
  dependencies.revalidatePath("/nabory", "page");

  const slugs = new Set(order.lines.map((line) => line.slug));
  for (const slug of slugs) {
    for (const [type, route] of [
      ["tovar", "tovary"],
      ["nabor", "nabory"],
    ] as const) {
      dependencies.revalidateTag(`product-slug:${type}:${slug}`);
      dependencies.revalidatePath(`/${route}/${slug}`, "page");
    }
  }
}
