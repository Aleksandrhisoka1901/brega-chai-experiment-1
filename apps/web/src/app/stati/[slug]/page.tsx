import type { Metadata } from "next";

import { articleItemMetadata } from "@/components/articles-landing-page";
import { ArticleItemPage } from "@/components/article-item-page";

export const dynamic = "force-dynamic";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  return articleItemMetadata(slug);
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  return <ArticleItemPage slug={slug} />;
}
