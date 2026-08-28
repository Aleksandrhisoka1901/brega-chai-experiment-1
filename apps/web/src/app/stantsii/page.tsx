import type { Metadata } from "next";

import {
  CatalogLandingPage,
  catalogLandingMetadata,
  type CatalogSearchParams,
  resolveRequestedCatalogPage,
} from "@/components/catalog-landing-page";

export const dynamic = "force-dynamic";

type StantsiiPageProps = { searchParams: CatalogSearchParams };

export async function generateMetadata({
  searchParams,
}: StantsiiPageProps): Promise<Metadata> {
  const query = await resolveRequestedCatalogPage("stantsii", searchParams);
  return catalogLandingMetadata({ route: "stantsii", query });
}

export default async function StantsiiPage({ searchParams }: StantsiiPageProps) {
  const query = await resolveRequestedCatalogPage("stantsii", searchParams);
  return <CatalogLandingPage route="stantsii" query={query} />;
}
