import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/contratos?*", "/empresas?*", "/sueldos?*", "/presupuesto?*"],
      },
    ],
    sitemap: "https://ubrique-transparente.vercel.app/sitemap.xml",
  };
}
