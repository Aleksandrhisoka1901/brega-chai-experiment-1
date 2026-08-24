import type { Metadata } from "next";

import {
  CatalogLandingPage,
  catalogLandingMetadata,
  type CatalogSearchParams,
  resolveRequestedCatalogPage,
} from "@/components/catalog-landing-page";

export const dynamic = "force-dynamic";

type TovaryPageProps = { searchParams: CatalogSearchParams };

export async function generateMetadata({
  searchParams,
}: TovaryPageProps): Promise<Metadata> {
  const query = await resolveRequestedCatalogPage("tovary", searchParams);
  return catalogLandingMetadata({ route: "tovary", query });
}

export default async function TovaryPage({ searchParams }: TovaryPageProps) {
  const query = await resolveRequestedCatalogPage("tovary", searchParams);
  return <CatalogLandingPage route="tovary" query={query} />;
}
