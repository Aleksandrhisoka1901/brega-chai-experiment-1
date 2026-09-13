import type { Metadata } from "next";

import {
  capabilityPageMetadata,
  CapabilityStorefrontPage,
} from "@/components/capability-page";

export function generateMetadata(): Metadata {
  return capabilityPageMetadata();
}

export default function TipovyeResheniyaPage() {
  return <CapabilityStorefrontPage />;
}
