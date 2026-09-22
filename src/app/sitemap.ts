import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/format";

/** The public marketing pages. Business pages are per-tenant and not listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: updated, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/how-it-works`, lastModified: updated, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/features`, lastModified: updated, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: updated, changeFrequency: "monthly", priority: 0.9 },
  ];
}
