import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/lib/companies";
import { labelContractType } from "@/lib/contracts";

const fmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const fmtDate = (d: Date | null) =>
  d
    ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

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

type PageProps = { params: Promise<{ nif: string }> };

export default async function EmpresaDetailPage({ params }: PageProps) {
  const { nif } = await params;
  const company = await getCompanyDetail(decodeURIComponent(nif));

  if (!company) notFound();

  const isRealNif = /^[A-Z0-9]{9}$/.test(company.nif);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <a href="/empresas" className="hover:text-brand-600">Empresas</a>
        <span className="mx-2">›</span>
        <span className="text-gray-900 truncate">{company.name}</span>
      </nav>

      {/* Cabecera */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">{company.name}</h1>
        {isRealNif && <p className="text-sm text-gray-400 mt-1 font-mono">{company.nif}</p>}
        <p className="text-sm text-gray-500 mt-1">
          {company.firstYear === company.lastYear
            ? `Actividad en ${company.firstYear}`
            : `Actividad de ${company.firstYear} a ${company.lastYear}`}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total adjudicado</p>
          <p className="text-xl md:text-2xl font-bold text-brand-600 mt-1">{fmt.format(company.totalAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Contratos</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">{company.contracts}</p>
        </div>
      </div>

      {/* Móvil: tarjetas */}
      <div className="md:hidden space-y-3">
        {company.rows.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_BADGE[c.status ?? "published"] ?? "bg-gray-100 text-gray-700"}`}>
                {STATUS_LABEL[c.status ?? "published"] ?? c.status}
              </span>
              <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                {c.amount ? fmt.format(Number(c.amount)) : "—"}
              </span>
            </div>
            <p className="font-medium text-gray-900 text-sm leading-snug">{c.title}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>{fmtDate(c.awardedDate ?? c.publishedDate)}</span>
              <span>{labelContractType(c.contractType)}</span>
              {c.sourceUrl && (
                <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-brand-600 hover:underline">
                  Ver en PCSP ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Contratos adjudicados</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Título</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 w-32">Importe</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {company.rows.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 line-clamp-2 leading-snug">{c.title}</p>
                  {c.sourceUrl && (
                    <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline mt-0.5 inline-block">
                      Ver en PCSP ↗
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                  {c.amount ? fmt.format(Number(c.amount)) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">{labelContractType(c.contractType)}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(c.awardedDate ?? c.publishedDate)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status ?? "published"] ?? "bg-gray-100 text-gray-700"}`}>
                    {STATUS_LABEL[c.status ?? "published"] ?? c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
