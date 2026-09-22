import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // A ticket URL is a customer's private credential, and the signed-in app
      // has nothing to index.
      disallow: ["/t/", "/api/", "/dashboard", "/queue", "/counter", "/billing", "/settings", "/services", "/analytics", "/qr", "/onboarding"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
