import type { MetadataRoute } from "next";

/**
 * Crawlers must be able to read route-level noindex metadata. Do not use
 * robots.txt as access control; private and tokenized routes enforce their own
 * authorization and noindex policies.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
