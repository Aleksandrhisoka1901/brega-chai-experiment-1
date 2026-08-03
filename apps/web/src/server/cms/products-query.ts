const productFields = {
  "fields[0]": "displayName",
  "fields[1]": "slug",
  "fields[2]": "type",
  "fields[3]": "packageLabel",
  "fields[4]": "price",
  "fields[5]": "stock",
  "fields[6]": "cardExcerpt",
  "populate[mainImage][populate][image][fields][0]": "url",
  "populate[mainImage][populate][image][fields][1]": "alternativeText",
  "populate[mainImage][populate][image][fields][2]": "formats",
  "populate[mainImage][populate][image][fields][3]": "width",
  "populate[mainImage][populate][image][fields][4]": "height",
};

export function productCatalogRequests() {
  return [
    { stockFilter: "filters[stock][$gt]", stockValue: "0" },
    { stockFilter: "filters[stock][$eq]", stockValue: "0" },
  ].map(({ stockFilter, stockValue }) => {
    const query = new URLSearchParams({
      status: "published",
      "filters[type][$eq]": "tovar",
      [stockFilter]: stockValue,
      "sort[0]": "displayName:asc",
      ...productFields,
      "pagination[pageSize]": "100",
    });

    return { path: `/api/products?${query}`, tags: ["products"] };
  });
}
