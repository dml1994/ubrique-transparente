import { NextRequest, NextResponse } from "next/server";

// Rate limiting básico en Edge: máx. 60 peticiones por IP por minuto.
// El mapa se reinicia al reiniciar la instancia de edge, pero como cada
// instancia es de corta vida en Vercel, es suficiente para frenar abusos simples.

const WINDOW_MS  = 60_000; // 1 minuto
const MAX_REQ    = 60;     // peticiones permitidas por ventana por IP

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function proxy(req: NextRequest) {
  const ip    = getIp(req);
  const now   = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  entry.count += 1;

  if (entry.count > MAX_REQ) {
    return new NextResponse("Demasiadas peticiones. Espera un momento.", {
      status: 429,
      headers: {
        "Retry-After": "60",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  // Solo aplica a las páginas, no a assets estáticos
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
