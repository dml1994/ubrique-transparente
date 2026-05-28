import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Evita indexación de combinaciones de filtros (millones de URLs posibles)
        disallow: ["/contratos?*", "/empresas?*", "/sueldos?*", "/presupuesto?*"],
      },
    ],
  };
}
