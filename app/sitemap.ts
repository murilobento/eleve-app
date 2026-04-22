import type { MetadataRoute } from "next";

import { listPublicEquipment, listPublicServices } from "@/lib/public-site-data";
import {
  PUBLIC_SITE_REVALIDATE_SECONDS,
  getPublicSiteUrl,
} from "@/lib/public-site-seo";

export const revalidate = PUBLIC_SITE_REVALIDATE_SECONDS;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, equipment] = await Promise.all([
    listPublicServices(true),
    listPublicEquipment(true),
  ]);

  return [
    {
      url: getPublicSiteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...services.map((service) => ({
      url: getPublicSiteUrl(`/servicos/${service.slug}`),
      lastModified: new Date(service.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...equipment.map((item) => ({
      url: getPublicSiteUrl(`/equipamentos/${item.slug}`),
      lastModified: new Date(item.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
