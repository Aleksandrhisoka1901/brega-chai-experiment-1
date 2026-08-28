import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { JsonLd } from "@/components/json-ld";
import { NavigationProgress } from "@/components/navigation-progress";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AnalyticsConsent } from "@/features/analytics/analytics-consent";
import { siteOrigin } from "@/lib/seo/metadata";
import { bindShortRussianWords } from "@/lib/typography";
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
    title: settings?.defaultSeo.title ?? "Brega",
    description:
      settings?.defaultSeo.description ??
      "Портативные электростанции и солнечные панели для дома и резервного питания",
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      shortcut: "/favicon.svg",
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    alternates: { canonical: "/" },
    ...(settings?.defaultSeo.imageUrl
      ? { openGraph: { images: [{ url: settings.defaultSeo.imageUrl }] } }
      : {}),
  };
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f5f7fa",
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
            settings?.brandName ?? "Brega",
          )}
        />
        <JsonLd
          data={websiteStructuredData(
            siteOrigin(),
            settings?.brandName ?? "Brega",
          )}
        />
        <a className="skip-link" href="#main-content">
          {bindShortRussianWords("К содержимому")}
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
                  maxItemQuantity: settings.maxItemQuantity,
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
        <AnalyticsConsent />
      </body>
    </html>
  );
}
