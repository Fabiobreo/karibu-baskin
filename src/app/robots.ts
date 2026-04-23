import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/profilo", "/notifiche"],
      },
    ],
    sitemap: "https://karibu-baskin.vercel.app/sitemap.xml",
  };
}
