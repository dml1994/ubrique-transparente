import { notFound } from "next/navigation";
import { getEventById, getEventContracts } from "@/lib/events";
import { labelContractType } from "@/lib/contracts";

const fmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const fmtDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—";

type PageProps = { params: Promise<{ id: string }> };

export default async function EventoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const eventId = parseInt(id, 10);
  if (isNaN(eventId)) notFound();

  const [event, contracts] = await Promise.all([
    getEventById(eventId),
    getEventContracts(eventId),
  ]);

  if (!event) notFound();

  const totalAmount = contracts.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <a href="/eventos" className="text-sm text-brand-600 hover:underline">← Todos los eventos</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{event.name}</h1>
        <p className="text-sm text-gray-500 mt-1">Año {event.year}</p>
        {event.description && (
          <p className="text-gray-600 mt-2">{event.description}</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Gasto total</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">{fmt.format(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Contratos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{contracts.length}</p>
        </div>
      </div>

      {/* Tabla de contratos */}
      {contracts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Sin contratos vinculados a este evento.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Título</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Adjudicataria</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Importe</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 line-clamp-2">{c.title}</p>
                      {c.sourceUrl && (
                        <a
                          href={c.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:underline"
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
                    <td className="px-4 py-3 text-gray-600">{labelContractType(c.contractType)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {fmtDate(c.awardedDate)}
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
