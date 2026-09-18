import type { Metadata } from "next";

import {
  capabilityPageMetadata,
  CapabilityStorefrontPage,
} from "@/components/capability-page";
import { getCapabilityPage } from "@/server/cms/capability-page";

export async function generateMetadata(): Promise<Metadata> {
  return capabilityPageMetadata(await getCapabilityPage());
}

export default async function TipovyeResheniyaPage() {
  const content = await getCapabilityPage();
  return <CapabilityStorefrontPage content={content} />;
}
