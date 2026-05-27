import { Suspense } from "react";
import {
  getContracts,
  getContractStats,
  getYearStats,
  getDistinctTypes,
  labelContractType,
  type ContractsFilter,
} from "@/lib/contracts";
import ContractsFilters from "./ContractsFilters";
import Pagination from "@/components/Pagination";

const fmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const fmtDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_BADGE: Record<string, string> = {
  awarded:     "bg-green-100 text-green-800",
  published:   "bg-blue-100 text-blue-800",
  cancelled:   "bg-red-100 text-red-800",
  in_progress: "bg-yellow-100 text-yellow-800",
};

const STATUS_LABEL: Record<string, string> = {
  awarded:     "Adjudicado",
  published:   "Publicado",
  cancelled:   "Cancelado",
  in_progress: "En tramitación",
};

type PageProps = {
  searchParams: Promise<ContractsFilter>;
};

export default async function ContratosPage({ searchParams }: PageProps) {
  const filters = await searchParams;

  const [{ rows, total, page, totalPages }, stats, yearStats, typesCodes] =
    await Promise.all([
      getContracts(filters),
      getContractStats(),
      getYearStats(),
      getDistinctTypes(),
    ]);

  const types = typesCodes.map((code) => ({
    code,
    label: labelContractType(code),
  }));

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contratos públicos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Datos de la Plataforma de Contratación del Sector Público · Actualización diaria
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total contratos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Number(stats.total).toLocaleString("es-ES")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Importe total</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">
            {fmt.format(Number(stats.totalAmount))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Última actualización</p>
          <p className="text-lg font-semibold text-gray-700 mt-1">
            {stats.lastUpdated
              ? new Date(stats.lastUpdated).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
              : "—"}
          </p>
        </div>
      </div>

      {/* Selector de año */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Filtrar por año</p>
        <div className="flex flex-wrap gap-3">
          {yearStats.map((stat) => {
            const isActive = filters.year === String(stat.year);
            const params = new URLSearchParams({
              ...(filters.q    ? { q:    filters.q    } : {}),
              ...(filters.type ? { type: filters.type } : {}),
              ...(filters.sort ? { sort: filters.sort } : {}),
              ...(filters.order ? { order: filters.order } : {}),
              ...(isActive ? {} : { year: String(stat.year) }),
            });
            return (
              <a
                key={stat.year}
                href={`/contratos?${params.toString()}`}
                className={`rounded-xl border px-5 py-3 text-center transition-colors min-w-[110px] ${
                  isActive
                    ? "bg-brand-600 border-brand-600 text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-800 hover:border-brand-400 hover:bg-brand-50"
                }`}
              >
                <p className="text-xl font-bold">{stat.year}</p>
                <p className={`text-sm font-medium mt-0.5 ${isActive ? "text-white/80" : "text-brand-600"}`}>
                  {fmt.format(stat.amount)}
                </p>
                <p className={`text-xs mt-0.5 ${isActive ? "text-white/60" : "text-gray-400"}`}>
                  {stat.total} contrato{stat.total !== 1 ? "s" : ""}
                </p>
              </a>
            );
          })}
        </div>
      </div>

      {/* Filtros */}
      <Suspense fallback={null}>
        <ContractsFilters types={types} />
      </Suspense>

      {/* Resultados */}
      <div className="text-sm text-gray-500">
        {total === 0 ? (
          "No se encontraron contratos con los filtros aplicados."
        ) : (
          <>
            <span className="font-medium text-gray-900">{total.toLocaleString("es-ES")}</span>{" "}
            contrato{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </>
        )}
      </div>

      {/* Tabla */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-400 text-xs w-8">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-2/5">Título</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-1/4">Adjudicataria</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Importe</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-300 font-mono">{c.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 line-clamp-2 leading-snug">
                        {c.title}
                      </p>
                      {c.cpvDescription && (
                        <p className="text-xs text-gray-400 mt-0.5">{c.cpvDescription}</p>
                      )}
                      {c.sourceUrl && (
                        <a
                          href={c.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:underline mt-0.5 inline-block"
                        >
                          Ver en PCSP ↗
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.awardedTo ?? <span className="text-gray-400 italic">Sin adjudicar</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {c.amount ? fmt.format(Number(c.amount)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {labelContractType(c.contractType)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {fmtDate(c.publishedDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status ?? "published"] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {STATUS_LABEL[c.status ?? "published"] ?? c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} />
      )}
    </div>
  );
}
