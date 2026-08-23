import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Страницы записей — служебные. В /z/ ничего секретного нет, но и в
      // поиске им делать нечего, а /m/ вообще нельзя показывать никому,
      // кроме мастера с подписанной ссылкой.
      disallow: ["/z/", "/m/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
