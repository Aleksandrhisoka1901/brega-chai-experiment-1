import type { Metadata } from "next";

import {
  catalogItemMetadata,
  CatalogItemPage,
} from "@/components/catalog-item-page";

type NaborPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: NaborPageProps): Promise<Metadata> {
  const { slug } = await params;

  return catalogItemMetadata({
    route: "nabory",
    slug,
  });
}

export default async function NaborPage({ params }: NaborPageProps) {
  const { slug } = await params;

  return CatalogItemPage({
    route: "nabory",
    slug,
  });
}
