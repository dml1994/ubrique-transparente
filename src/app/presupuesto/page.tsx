import { getBudgetLines, getBudgetYears, getBudgetStats } from "@/lib/budget";

const fmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type PageProps = { searchParams: Promise<{ year?: string }> };

export default async function PresupuestoPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const year = filters.year ? parseInt(filters.year, 10) : undefined;

  const [rows, years, stats] = await Promise.all([
    getBudgetLines(year),
    getBudgetYears(),
    getBudgetStats(year),
  ]);

  const pct = Number(stats.planned) > 0
    ? Math.round((Number(stats.executed) / Number(stats.planned)) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Presupuesto municipal</h1>
        <p className="text-sm text-gray-500 mt-1">
          Desglose de ingresos y gastos por partida presupuestaria, con ejecución real vs planificada
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Presupuesto planificado</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {fmt.format(Number(stats.planned))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Ejecutado</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">
            {fmt.format(Number(stats.executed))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">% Ejecución</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {pct !== null ? `${pct}%` : "—"}
          </p>
        </div>
      </div>

      {/* Selector de año */}
      {years.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Filtrar por año</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/presupuesto"
              className={`rounded-xl border px-5 py-2 text-sm font-medium transition-colors ${
                !filters.year
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-white border-gray-200 text-gray-700 hover:border-brand-400"
              }`}
            >
              Todos
            </a>
            {years.map((y) => (
              <a
                key={y}
                href={`/presupuesto?year=${y}`}
                className={`rounded-xl border px-5 py-2 text-sm font-medium transition-colors ${
                  filters.year === String(y)
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
          <p className="text-4xl mb-4">📊</p>
          <p className="text-lg font-semibold text-gray-700">Sin datos de presupuesto todavía</p>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            Los presupuestos municipales se obtienen de la Sede Electrónica del Ayuntamiento.
            Próximamente disponibles.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">Año</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Sección</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Programa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 w-36">Planificado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 w-36">Ejecutado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">% Ejec.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((b) => {
                  const rowPct =
                    Number(b.plannedAmount) > 0
                      ? Math.round((Number(b.executedAmount) / Number(b.plannedAmount)) * 100)
                      : null;
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{b.year}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{b.section ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{b.program ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-900">{b.description}</td>
                      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                        {b.plannedAmount ? fmt.format(Number(b.plannedAmount)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                        {b.executedAmount ? fmt.format(Number(b.executedAmount)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {rowPct !== null ? (
                          <span
                            className={`font-medium ${
                              rowPct >= 90 ? "text-green-600" :
                              rowPct >= 50 ? "text-yellow-600" : "text-red-500"
                            }`}
                          >
                            {rowPct}%
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
