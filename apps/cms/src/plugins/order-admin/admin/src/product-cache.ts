import { adminApi } from "@strapi/admin/strapi-admin";
import { useCallback } from "react";
import { useDispatch } from "react-redux";

import { productCacheTags } from "./product-cache-model";

const cacheApi = adminApi.enhanceEndpoints({
  addTagTypes: ["Document"],
});

export function useInvalidateProductCache() {
  const dispatch = useDispatch<any>();

  return useCallback(() => {
    dispatch(cacheApi.util.invalidateTags(productCacheTags));
  }, [dispatch]);
}
