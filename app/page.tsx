import type { Metadata } from "next";

import { defaultLocale } from "@/i18n/config";
import { getPublicSiteContent } from "@/lib/public-site-data";
import {
  PUBLIC_SITE_REVALIDATE_SECONDS,
  buildItemListJsonLd,
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  compactDescription,
  getHomeSeoDescription,
  getHomeSeoTitle,
  getPublicSiteBaseUrl,
  getPublicSiteUrl,
} from "@/lib/public-site-seo";

import { SiteEleveLanding } from "./landing/site-eleve-landing";

export const revalidate = PUBLIC_SITE_REVALIDATE_SECONDS;

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublicSiteContent();
  const title = getHomeSeoTitle(content.company);
  const description = compactDescription(getHomeSeoDescription(content.company));
  const firstImage = content.services[0]?.imageUrl || content.equipment[0]?.imageUrl;

  return {
    metadataBase: new URL(getPublicSiteBaseUrl()),
    title,
    description,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title,
      description,
      url: getPublicSiteUrl("/"),
      siteName: content.company?.name || "Eleve Locacoes",
      locale: "pt_BR",
      type: "website",
      images: firstImage ? [{ url: firstImage, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: firstImage ? [firstImage] : undefined,
    },
  };
}

export default async function HomePage() {
  const content = await getPublicSiteContent();
  const jsonLd = [
    buildOrganizationJsonLd(content.company),
    buildLocalBusinessJsonLd(content.company),
    buildWebsiteJsonLd(content.company),
    buildItemListJsonLd(
      content.services.map((service) => ({
        name: service.title,
        url: getPublicSiteUrl(`/servicos/${service.slug}`),
      })),
      "/#services",
      "Servicos",
    ),
    buildItemListJsonLd(
      content.equipment.map((equipment) => ({
        name: equipment.name,
        url: getPublicSiteUrl(`/equipamentos/${equipment.slug}`),
      })),
      "/#equipment",
      "Equipamentos",
    ),
  ];

  return (
    <>
      <SiteEleveLanding locale={defaultLocale} initialContent={content} />
      {jsonLd.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
