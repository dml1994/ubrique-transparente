import { getSalaries, getSalaryYears, getSalaryStats } from "@/lib/salaries";

const fmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type PageProps = { searchParams: Promise<{ year?: string }> };

export default async function SueldosPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const year = filters.year ? parseInt(filters.year, 10) : undefined;

  const [rows, years, stats] = await Promise.all([
    getSalaries(year),
    getSalaryYears(),
    getSalaryStats(year),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sueldos de cargos públicos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Retribuciones anuales del alcalde, concejales y funcionarios de libre designación
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Cargos registrados</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Number(stats.total).toLocaleString("es-ES")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Coste total anual</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">
            {fmt.format(Number(stats.totalAmount))}
          </p>
        </div>
      </div>

      {/* Selector de año */}
      {years.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Filtrar por año</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/sueldos"
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
                href={`/sueldos?year=${y}`}
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
          <p className="text-4xl mb-4">💰</p>
          <p className="text-lg font-semibold text-gray-700">Sin datos de sueldos todavía</p>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            Los datos de retribuciones se obtienen del Portal de Transparencia y el BOP de Cádiz.
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
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Sueldo bruto</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Complementos</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Año</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.position}</td>
                    <td className="px-4 py-3 text-gray-600">{s.personName ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                      {s.grossAnnual ? fmt.format(Number(s.grossAnnual)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                      {s.allowances ? fmt.format(Number(s.allowances)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {s.total ? fmt.format(Number(s.total)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{s.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
