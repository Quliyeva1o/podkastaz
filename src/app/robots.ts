import type { MetadataRoute } from "next";
import { siteNoindex, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (siteNoindex) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
