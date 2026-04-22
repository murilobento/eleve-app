import type { MetadataRoute } from "next";

import { getPublicSiteUrl } from "@/lib/public-site-seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/dashboard/",
        "/pt-BR/dashboard/",
        "/en/dashboard/",
      ],
    },
    sitemap: getPublicSiteUrl("/sitemap.xml"),
  };
}
