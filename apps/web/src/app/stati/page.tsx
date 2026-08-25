import type { Metadata } from "next";

import { articlesLandingMetadata, ArticlesLandingPage } from "@/components/articles-landing-page";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return articlesLandingMetadata();
}

export default function StatiPage() {
  return <ArticlesLandingPage />;
}
