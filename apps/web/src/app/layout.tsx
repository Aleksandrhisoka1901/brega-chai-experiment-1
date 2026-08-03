import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { JsonLd } from "@/components/json-ld";
import { NavigationProgress } from "@/components/navigation-progress";
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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getGlobalSettings().catch((error: unknown) => {
    if (error instanceof CmsUnavailableError) return null;
    throw error;
  });

  return {
    metadataBase: new URL(siteOrigin()),
    title: settings?.defaultSeo.title ?? "Brega Tea",
    description: settings?.defaultSeo.description ?? "Чай и ритуалы Brega Tea",
    alternates: { canonical: "/" },
    ...(settings?.defaultSeo.imageUrl
      ? { openGraph: { images: [{ url: settings.defaultSeo.imageUrl }] } }
      : {}),
  };
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#efede4",
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
      <head>
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
      </head>
      <body>
        <NavigationProgress />
        <JsonLd
          data={organizationStructuredData(
            siteOrigin(),
            settings?.brandName ?? "Brega Tea",
          )}
        />
        <JsonLd
          data={websiteStructuredData(
            siteOrigin(),
            settings?.brandName ?? "Brega Tea",
          )}
        />
        <a className="skip-link" href="#main-content">
          К содержимому
        </a>
        <SiteHeader
          brandName={settings?.brandName}
          contacts={
            settings
              ? {
                  email: settings.email,
                  telegramUrl: settings.telegramUrl,
                }
              : undefined
          }
          checkoutSettings={
            settings
              ? {
                  courierDeliveryNote: settings.courierDeliveryNote,
                  pickupAddress: settings.pickupAddress,
                  pickupDiscountPercent: settings.pickupDiscountPercent,
                }
              : undefined
          }
          logo={settings?.logo}
          navigation={settings?.navigation}
        />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        {settings ? <SiteFooter settings={settings} /> : null}
      </body>
    </html>
  );
}
