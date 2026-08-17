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
  const page = await resolveRequestedCatalogPage("tovary", searchParams);
  return catalogLandingMetadata({ route: "tovary", page });
}

export default async function TovaryPage({ searchParams }: TovaryPageProps) {
  const page = await resolveRequestedCatalogPage("tovary", searchParams);
  return <CatalogLandingPage route="tovary" page={page} />;
}
