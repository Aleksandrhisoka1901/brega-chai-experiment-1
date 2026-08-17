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
  const page = await resolveRequestedCatalogPage("nabory", searchParams);
  return catalogLandingMetadata({ route: "nabory", page });
}

export default async function NaboryPage({ searchParams }: NaboryPageProps) {
  const page = await resolveRequestedCatalogPage("nabory", searchParams);
  return <CatalogLandingPage route="nabory" page={page} />;
}
