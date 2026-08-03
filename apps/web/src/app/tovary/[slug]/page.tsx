import type { Metadata } from "next";

import {
  catalogItemMetadata,
  CatalogItemPage,
} from "@/components/catalog-item-page";

type TovarPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: TovarPageProps): Promise<Metadata> {
  const { slug } = await params;

  return catalogItemMetadata({
    route: "tovary",
    slug,
  });
}

export default async function TovarPage({ params }: TovarPageProps) {
  const { slug } = await params;

  return CatalogItemPage({
    route: "tovary",
    slug,
  });
}
