import { useFetchClient } from "@strapi/admin/strapi-admin";
import { useMemo } from "react";

import type {
  EditOrderCommand,
  OrderDetail,
  OrderListResponse,
  OrderProductOption,
} from "./types";
import { unwrapDetailResponse } from "./view-model";
import { useInvalidateProductCache } from "./product-cache";

export function useOrderAdminApi() {
  const { del, get, post, put } = useFetchClient();
  const invalidateProductCache = useInvalidateProductCache();

  return useMemo(
    () => ({
      async list(search: string) {
        const response = await get<OrderListResponse>(
          `/order-admin/orders${search}`,
        );
        return response.data;
      },
      async findOne(documentId: string) {
        const response = await get<{ data: OrderDetail }>(
          `/order-admin/orders/${encodeURIComponent(documentId)}`,
        );
        return unwrapDetailResponse(response.data);
      },
      async products(search = "") {
        const query = search.trim()
          ? `?search=${encodeURIComponent(search.trim())}`
          : "";
        const response = await get<{ data: OrderProductOption[] }>(
          `/order-admin/products${query}`,
        );
        return response.data.data;
      },
      async edit(documentId: string, command: EditOrderCommand) {
        const response = await put<{ data: OrderDetail }>(
          `/order-admin/orders/${encodeURIComponent(documentId)}`,
          command,
        );
        const order = unwrapDetailResponse(response.data);
        invalidateProductCache();
        return order;
      },
      async transition(documentId: string, status: OrderDetail["status"]) {
        const response = await post<{ data: OrderDetail }>(
          `/order-admin/orders/${encodeURIComponent(documentId)}/status`,
          { status },
        );
        const order = unwrapDetailResponse(response.data);
        if (status === "cancelled") invalidateProductCache();
        return order;
      },
      async delete(documentId: string) {
        const response = await del<{ data: { documentId: string } }>(
          `/order-admin/orders/${encodeURIComponent(documentId)}`,
        );
        invalidateProductCache();
        return response.data.data;
      },
    }),
    [del, get, invalidateProductCache, post, put],
  );
}
