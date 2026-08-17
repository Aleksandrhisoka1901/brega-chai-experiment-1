import type { CacheRevalidationSender } from "../../../cache-revalidation/index.js";

interface RevalidationLogger {
  warn(...args: unknown[]): void;
}

export async function runStockMutationWithRevalidation<T>(
  mutation: () => Promise<T>,
  sender: CacheRevalidationSender,
  logger?: RevalidationLogger,
): Promise<T> {
  const result = await mutation();

  try {
    await sender.send({ event: "products", action: "update" });
  } catch (error) {
    // The stock transaction is already committed. The sender handles and logs
    // expected delivery failures; an unexpected exception must not turn the
    // successful admin action into a misleading error response.
    logger?.warn("Order stock cache revalidation failed unexpectedly", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return result;
}
