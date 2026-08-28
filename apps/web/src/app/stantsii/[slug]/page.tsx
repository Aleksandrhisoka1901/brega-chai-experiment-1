import type { Metadata } from "next";

import {
  catalogItemMetadata,
  CatalogItemPage,
} from "@/components/catalog-item-page";

type StantsiyaPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: StantsiyaPageProps): Promise<Metadata> {
  const { slug } = await params;

  return catalogItemMetadata({
    route: "stantsii",
    slug,
  });
}

export default async function StantsiyaPage({ params }: StantsiyaPageProps) {
  const { slug } = await params;

  return CatalogItemPage({
    route: "stantsii",
    slug,
  });
}
