import { getBudgetLines, getBudgetYears, getBudgetStats } from "@/lib/budget";

const fmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type PageProps = { searchParams: Promise<{ year?: string; seccion?: string }> };

export default async function PresupuestoPage({ searchParams }: PageProps) {
  const filters = await searchParams;

  const years = await getBudgetYears();
  const latestYear = years[0];
  const selectedYear = filters.year ? parseInt(filters.year, 10) : latestYear;

  const [rows, stats] = await Promise.all([
    getBudgetLines(selectedYear),
    getBudgetStats(selectedYear),
  ]);

  const gastos   = rows.filter((r) => r.section === "Gastos");
  const ingresos = rows.filter((r) => r.section === "Ingresos");

  // Mostrar solo últimos 10 años en el selector para no saturar
  const recentYears = years.slice(0, 10);
  const olderYears  = years.slice(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Presupuesto municipal</h1>
        <p className="text-sm text-gray-500 mt-1">
          Desglose de ingresos y gastos por partida presupuestaria.
          Fuente: Ministerio de Hacienda (Gobierto).
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Gastos {selectedYear}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt.format(stats.gastos)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Ingresos {selectedYear}</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">{fmt.format(stats.ingresos)}</p>
        </div>
      </div>

      {/* Selector de año */}
      {years.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Año</p>
          <div className="flex flex-wrap gap-2">
            {recentYears.map((y) => (
              <a
                key={y}
                href={`/presupuesto?year=${y}`}
                className={`rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedYear === y
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:border-brand-400"
                }`}
              >
                {y}
              </a>
            ))}
            {olderYears.length > 0 && (
              <details className="relative">
                <summary className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-brand-400 list-none">
                  {olderYears.includes(selectedYear) ? selectedYear : `Más años ▾`}
                </summary>
                <div className="absolute top-full left-0 mt-1 z-10 flex flex-wrap gap-2 bg-white border border-gray-200 rounded-xl p-3 shadow-lg w-48">
                  {olderYears.map((y) => (
                    <a
                      key={y}
                      href={`/presupuesto?year=${y}`}
                      className={`rounded-lg border px-3 py-1 text-sm font-medium transition-colors ${
                        selectedYear === y
                          ? "bg-brand-600 border-brand-600 text-white"
                          : "bg-white border-gray-200 text-gray-700 hover:border-brand-400"
                      }`}
                    >
                      {y}
                    </a>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Tabla o estado vacío */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-lg font-semibold text-gray-700">Sin datos de presupuesto</p>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            Los presupuestos municipales se obtienen del Ministerio de Hacienda. Próximamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {[{ label: "Gastos", items: gastos }, { label: "Ingresos", items: ingresos }].map(
            ({ label, items }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
                  <span className="text-sm font-semibold text-gray-900">
                    {fmt.format(items.reduce((s, r) => s + Number(r.plannedAmount ?? 0), 0))}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Clasificación</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Descripción</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Planificado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-gray-400 text-xs font-mono whitespace-nowrap">
                            {b.program} · {b.category}
                          </td>
                          <td className="px-4 py-2.5 text-gray-800">{b.description}</td>
                          <td className="px-4 py-2.5 text-right text-gray-700 font-medium whitespace-nowrap">
                            {b.plannedAmount ? fmt.format(Number(b.plannedAmount)) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
