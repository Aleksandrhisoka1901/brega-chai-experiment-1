import type { Metadata } from "next";

import {
  CatalogLandingPage,
  catalogLandingMetadata,
  type CatalogSearchParams,
  resolveRequestedCatalogPage,
} from "@/components/catalog-landing-page";

export const dynamic = "force-dynamic";

type NaboryPageProps = { searchParams: CatalogSearchParams };

export async function generateMetadata({
  searchParams,
}: NaboryPageProps): Promise<Metadata> {
  const query = await resolveRequestedCatalogPage("nabory", searchParams);
  return catalogLandingMetadata({ route: "nabory", query });
}

export default async function NaboryPage({ searchParams }: NaboryPageProps) {
  const query = await resolveRequestedCatalogPage("nabory", searchParams);
  return <CatalogLandingPage route="nabory" query={query} />;
}
