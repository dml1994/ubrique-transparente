import { getContractStats } from "@/lib/contracts";

export default async function HomePage() {
  const stats = await getContractStats();
  return (
    <div>
      {/* Hero */}
      <section className="text-center py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          La administración de Ubrique,{" "}
          <span className="text-brand-600">sin filtros</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Contratos públicos, sueldos de cargos, presupuestos municipales y gastos
          por evento — actualizados automáticamente desde fuentes oficiales.
        </p>
      </section>

      {/* KPI cards (placeholder — se rellenarán con datos reales) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Contratos publicados", value: Number(stats.total).toLocaleString("es-ES"),                                                                                          href: "/contratos",   color: "bg-blue-50 text-blue-700"     },
          { label: "Total contratado",      value: new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(stats.totalAmount)), href: "/contratos",   color: "bg-green-50 text-green-700"   },
          { label: "Cargos con sueldo",     value: "—",                                                                                                                                href: "/sueldos",     color: "bg-purple-50 text-purple-700" },
          { label: "Presupuesto anual",     value: "—",                                                                                                                                href: "/presupuesto", color: "bg-orange-50 text-orange-700" },
        ].map((kpi) => (
          <a
            key={kpi.label}
            href={kpi.href}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
            <p className={`text-3xl font-bold ${kpi.color} inline-block px-2 py-0.5 rounded`}>
              {kpi.value}
            </p>
          </a>
        ))}
      </section>

      {/* Secciones */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            href: "/contratos",
            title: "Contratos públicos",
            desc: "Todos los contratos adjudicados por el Ayuntamiento de Ubrique, con importes, empresas adjudicatarias y fechas.",
            icon: "📄",
          },
          {
            href: "/sueldos",
            title: "Sueldos de cargos",
            desc: "Retribuciones anuales de alcalde, concejales y funcionarios de libre designación.",
            icon: "💰",
          },
          {
            href: "/presupuesto",
            title: "Presupuesto municipal",
            desc: "Desglose de ingresos y gastos por partida presupuestaria, con ejecución real vs planificada.",
            icon: "📊",
          },
          {
            href: "/eventos",
            title: "Gastos por evento",
            desc: "¿Cuánto cuesta la Feria de Ubrique? Todos los contratos agrupados por evento o fiesta.",
            icon: "🎉",
          },
        ].map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow flex gap-4"
          >
            <span className="text-4xl">{card.icon}</span>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">{card.title}</h2>
              <p className="text-sm text-gray-500">{card.desc}</p>
            </div>
          </a>
        ))}
      </section>
    </div>
  );
}
