type BreadcrumbRoute = "tovary" | "nabory" | "stati";

type BreadcrumbInput = {
  route?: BreadcrumbRoute;
  label?: string;
};

const ROUTE_LABELS: Record<BreadcrumbRoute, string> = {
  tovary: "Товары",
  nabory: "Наборы",
  stati: "Статьи",
};

export function validateUniqueBreadcrumbRoutes(
  breadcrumbs: BreadcrumbInput[] | null | undefined,
): void {
  const routes = new Set<BreadcrumbRoute>();

  for (const breadcrumb of breadcrumbs ?? []) {
    if (!breadcrumb.route) continue;
    if (routes.has(breadcrumb.route)) {
      throw new Error(
        `Для раздела «${ROUTE_LABELS[breadcrumb.route]}» уже задан лейбл`,
      );
    }
    routes.add(breadcrumb.route);
  }
}
