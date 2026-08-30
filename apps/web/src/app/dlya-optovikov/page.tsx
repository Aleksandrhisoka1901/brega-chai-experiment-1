import type { Metadata } from "next";

import {
  wholesalePageMetadata,
  WholesaleStorefrontPage,
} from "@/components/wholesale-storefront-page";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return wholesalePageMetadata();
}

export default function DlyaOptovikovPage() {
  return <WholesaleStorefrontPage />;
}
