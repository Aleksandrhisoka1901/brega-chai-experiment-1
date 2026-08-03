import { useFetchClient } from "@strapi/admin/strapi-admin";
import { useMemo } from "react";

import type {
  EditOrderCommand,
  OrderDetail,
  OrderListResponse,
  OrderProductOption,
} from "./types";
import { unwrapDetailResponse } from "./view-model";

export function useOrderAdminApi() {
  const { get, post, put } = useFetchClient();

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
        return unwrapDetailResponse(response.data);
      },
      async transition(documentId: string, status: OrderDetail["status"]) {
        const response = await post<{ data: OrderDetail }>(
          `/order-admin/orders/${encodeURIComponent(documentId)}/status`,
          { status },
        );
        return unwrapDetailResponse(response.data);
      },
    }),
    [get, post, put],
  );
}
