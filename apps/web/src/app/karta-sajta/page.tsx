import type { Metadata } from "next";

import { SiteMapPage, siteMapPageMetadata } from "@/components/site-map-page";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return siteMapPageMetadata();
}

export default function KartaSajtaPage() {
  return <SiteMapPage />;
}
