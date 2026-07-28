import type { Metadata } from "next";
import type { ReactNode } from "react";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteOrigin } from "@/lib/seo/metadata";
import {
  organizationStructuredData,
  websiteStructuredData,
} from "@/lib/seo/structured-data";
import { CmsUnavailableError } from "@/server/cms/errors";
import { getGlobalSettings } from "@/server/cms/global";

import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "Brega Chai",
  description: "Чай и ритуалы Brega Chai",
  alternates: { canonical: "/" },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings = await getGlobalSettings().catch((error: unknown) => {
    if (error instanceof CmsUnavailableError) return null;
    throw error;
  });

  return (
    <html lang="ru">
      <body>
        <JsonLd data={organizationStructuredData(siteOrigin())} />
        <JsonLd data={websiteStructuredData(siteOrigin())} />
        <a className="skip-link" href="#main-content">
          К содержимому
        </a>
        <SiteHeader
          brandName={settings?.brandName}
          navigation={settings?.navigation}
        />
        <div id="main-content">{children}</div>
        {settings ? <SiteFooter settings={settings} /> : null}
      </body>
    </html>
  );
}
