import { getEvents } from "@/lib/events";

const fmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default async function EventosPage() {
  const events = await getEvents();

  const totalAmount = events.reduce((sum, e) => sum + Number(e.totalAmount ?? 0), 0);
  const totalContracts = events.reduce((sum, e) => sum + e.contractCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gastos por evento</h1>
        <p className="text-sm text-gray-500 mt-1">
          Contratos agrupados por evento o celebración — Feria, Semana Santa, Navidad y más
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Eventos registrados</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{events.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Contratos vinculados</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalContracts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Gasto total eventos</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">{fmt.format(totalAmount)}</p>
        </div>
      </div>

      {/* Lista de eventos o estado vacío */}
      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-lg font-semibold text-gray-700">Sin eventos registrados todavía</p>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            Los contratos públicos se clasifican automáticamente por evento (Feria de Ubrique,
            Semana Santa, Navidad…) usando inteligencia artificial. Esta sección estará disponible
            en cuanto se procese la clasificación.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => (
            <a
              key={event.id}
              href={`/eventos/${event.id}`}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{event.name}</p>
                  {event.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>
                  )}
                </div>
                <span className="text-sm text-gray-400 whitespace-nowrap">{event.year}</span>
              </div>
              <div className="mt-4 flex items-center gap-6 text-sm">
                <div>
                  <span className="text-xs text-gray-400 block">Gasto total</span>
                  <span className="font-semibold text-brand-600">
                    {event.totalAmount ? fmt.format(Number(event.totalAmount)) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block">Contratos</span>
                  <span className="font-medium text-gray-700">{event.contractCount}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
