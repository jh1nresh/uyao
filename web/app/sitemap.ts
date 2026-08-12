import type { MetadataRoute } from "next";

/**
 * No consumer route has passed the canonical-host and content-admission gates.
 * Keep the endpoint valid but empty until a verified production origin and the
 * first admitted pages are approved together.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
