import { getSalaries, getSalaryYears, getSalaryStats } from "@/lib/salaries";

const fmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type PageProps = { searchParams: Promise<{ year?: string }> };

export default async function SueldosPage({ searchParams }: PageProps) {
  const filters = await searchParams;

  const years = await getSalaryYears();
  const latestYear = years[0];

  // Defaultear al año más reciente si no hay filtro
  const selectedYear = filters.year
    ? parseInt(filters.year, 10)
    : latestYear;

  const [rows, stats] = await Promise.all([
    getSalaries(selectedYear),
    getSalaryStats(selectedYear),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sueldos de cargos públicos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Retribuciones anuales del alcalde y concejales del Ayuntamiento de Ubrique.
          Fuente: ISPA (Ministerio de Hacienda).
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Cargos con retribución</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Number(stats.total).toLocaleString("es-ES")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Coste total {selectedYear}</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">
            {fmt.format(Number(stats.totalAmount))}
          </p>
        </div>
      </div>

      {/* Selector de año */}
      {years.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Año</p>
          <div className="flex flex-wrap gap-3">
            {years.map((y) => (
              <a
                key={y}
                href={`/sueldos?year=${y}`}
                className={`rounded-xl border px-5 py-2 text-sm font-medium transition-colors ${
                  selectedYear === y
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:border-brand-400"
                }`}
              >
                {y}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tabla o estado vacío */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-4xl mb-4">💰</p>
          <p className="text-lg font-semibold text-gray-700">Sin datos de sueldos todavía</p>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            Los datos de retribuciones se obtienen del ISPA del Ministerio de Hacienda.
            Próximamente disponibles.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cargo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Retribución anual</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Dedicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((s) => {
                  const ded = s.position.includes("(parcial)")
                    ? "Parcial"
                    : s.position.includes("(sin dedicación)")
                    ? "Sin dedicación"
                    : "Exclusiva";
                  const posLabel = s.position
                    .replace(" (parcial)", "")
                    .replace(" (sin dedicación)", "");
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{posLabel}</td>
                      <td className="px-4 py-3 text-gray-600">{s.personName ?? <span className="text-gray-400 italic">No disponible</span>}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {s.total ? fmt.format(Number(s.total)) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          ded === "Exclusiva"
                            ? "bg-brand-50 text-brand-700"
                            : ded === "Parcial"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {ded}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">
              Datos ISPA {selectedYear} — Ministerio de Hacienda y Función Pública.
              {selectedYear === 2023 && " El año 2023 incluye dos períodos: mandato 2019 (hasta junio) y mandato 2023 (resto del año)."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
