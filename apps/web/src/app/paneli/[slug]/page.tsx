import type { Metadata } from "next";

import {
  catalogItemMetadata,
  CatalogItemPage,
} from "@/components/catalog-item-page";

type PanelPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PanelPageProps): Promise<Metadata> {
  const { slug } = await params;

  return catalogItemMetadata({
    route: "paneli",
    slug,
  });
}

export default async function PanelPage({ params }: PanelPageProps) {
  const { slug } = await params;

  return CatalogItemPage({
    route: "paneli",
    slug,
  });
}
