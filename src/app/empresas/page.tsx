import { getCompanies, getCompanyYears, getCompanyStats } from "@/lib/companies";

const fmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

type PageProps = { searchParams: Promise<{ year?: string }> };

export default async function EmpresasPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const year = filters.year ? parseInt(filters.year, 10) : undefined;

  const [companies, years, stats] = await Promise.all([
    getCompanies(year),
    getCompanyYears(),
    getCompanyStats(year),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Empresas adjudicatarias</h1>
        <p className="text-sm text-gray-500 mt-1">
          Empresas y autónomos que han recibido contratos del Ayuntamiento de Ubrique,
          ordenados por importe total adjudicado.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Empresas distintas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {stats.total.toLocaleString("es-ES")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total adjudicado</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">
            {fmt.format(stats.totalAmount)}
          </p>
        </div>
      </div>

      {/* Selector de año */}
      {years.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Filtrar por año</p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/empresas"
              className={`rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors ${
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
                href={`/empresas?year=${y}`}
                className={`rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors ${
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

      {/* Tabla */}
      {companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-lg font-semibold text-gray-700">Sin datos para este filtro</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-8">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa / Autónomo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Contratos</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 w-36">Total adjudicado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((c, i) => (
                  <tr key={c.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`/empresas/${encodeURIComponent(c.nif)}`}
                        className="font-medium text-gray-900 hover:text-brand-600 transition-colors"
                      >
                        {c.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.contracts}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {fmt.format(c.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {c.firstYear === c.lastYear
                        ? c.firstYear
                        : `${c.firstYear} – ${c.lastYear}`}
                    </td>
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
