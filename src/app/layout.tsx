import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ubrique Transparente",
  description: "Portal de transparencia del Ayuntamiento de Ubrique",
  keywords: ["transparencia", "ubrique", "contratos", "presupuesto", "sueldos"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">UT</span>
              </div>
              <span className="font-semibold text-gray-900">Ubrique Transparente</span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <a href="/contratos"   className="hover:text-brand-600 transition-colors">Contratos</a>
              <a href="/sueldos"     className="hover:text-brand-600 transition-colors">Sueldos</a>
              <a href="/presupuesto" className="hover:text-brand-600 transition-colors">Presupuesto</a>
              <a href="/empresas"    className="hover:text-brand-600 transition-colors">Empresas</a>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="mt-16 border-t border-gray-200 py-8 text-center text-sm text-gray-500">
          <p>Datos obtenidos de fuentes oficiales. Actualización automática diaria.</p>
          <p className="mt-1">
            <a href="https://contrataciondelestado.es" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Plataforma de Contratación del Sector Público
            </a>
            {" · "}
            <a href="https://www.ubrique.es" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Ayuntamiento de Ubrique
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
