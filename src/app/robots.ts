import type { MetadataRoute } from "next";

// internal school app: every page needs a login and holds student data, so nothing is indexable
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
