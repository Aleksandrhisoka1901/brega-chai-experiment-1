import type { Metadata } from "next";

import {
  ConformityDeclarationPage,
  conformityPageMetadata,
} from "@/components/conformity-declaration-page";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return conformityPageMetadata();
}

export default function DeklaraciyaSootvetstviyaPage() {
  return <ConformityDeclarationPage />;
}
