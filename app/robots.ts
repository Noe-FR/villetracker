import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Routes BFF : aucune valeur pour l'indexation, et elles gaspilleraient
        // le budget de crawl sur ~35 000 communes × 12 onglets.
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
