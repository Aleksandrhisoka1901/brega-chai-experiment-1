import type { Metadata } from "next";

import {
  CatalogLandingPage,
  catalogLandingMetadata,
  type CatalogSearchParams,
  resolveRequestedCatalogPage,
} from "@/components/catalog-landing-page";

export const dynamic = "force-dynamic";

type PaneliPageProps = { searchParams: CatalogSearchParams };

export async function generateMetadata({
  searchParams,
}: PaneliPageProps): Promise<Metadata> {
  const query = await resolveRequestedCatalogPage("paneli", searchParams);
  return catalogLandingMetadata({ route: "paneli", query });
}

export default async function PaneliPage({ searchParams }: PaneliPageProps) {
  const query = await resolveRequestedCatalogPage("paneli", searchParams);
  return <CatalogLandingPage route="paneli" query={query} />;
}
