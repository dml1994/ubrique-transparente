import type { NextConfig } from "next";

const securityHeaders = [
  // Evita que navegadores "adivinen" el Content-Type (protege contra MIME-sniffing)
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Prohíbe embeber la página en iframes de terceros (clickjacking / desinformación)
  { key: "X-Frame-Options",           value: "DENY" },
  // Controla qué información de referrer se envía a terceros
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Desactiva funcionalidades del navegador que no necesitamos
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  // Fuerza HTTPS durante 1 año (solo efectivo con HTTPS, que Vercel garantiza)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Content Security Policy: solo carga recursos del propio origen
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // Next.js necesita inline scripts
      "style-src 'self' 'unsafe-inline'",    // Tailwind genera estilos inline
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",              // Refuerza X-Frame-Options
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  typedRoutes: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
