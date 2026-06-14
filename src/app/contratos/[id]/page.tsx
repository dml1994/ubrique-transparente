import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getContractById, labelContractType } from "@/lib/contracts";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const contract = await getContractById(Number(id));
  if (!contract) return { title: "Contrato no encontrado" };
  return { title: contract.title };
}

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtDate = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const STATUS_BADGE: Record<string, string> = {
  published:   "bg-blue-100 text-blue-700",
  awarded:     "bg-green-100 text-green-700",
  cancelled:   "bg-red-100 text-red-700",
  in_progress: "bg-amber-100 text-amber-700",
};
const STATUS_LABEL: Record<string, string> = {
  published:   "Publicado",
  awarded:     "Adjudicado",
  cancelled:   "Cancelado",
  in_progress: "En tramitación",
};

function companyUrl(awardedTo: string | null, awardedToNif: string | null): string | null {
  if (!awardedTo) return null;
  const key = awardedToNif ?? awardedTo.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "");
  return `/empresas/${encodeURIComponent(key)}`;
}

export default async function ContratoDetallePage({ params }: Props) {
  const { id } = await params;
  const c = await getContractById(Number(id));
  if (!c) notFound();

  const empresaUrl = companyUrl(c.awardedTo, c.awardedToNif);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-1.5">
        <a href="/contratos" className="hover:text-brand-600 hover:underline">Contratos</a>
        <span>/</span>
        <span className="text-gray-700 truncate">#{c.id}</span>
      </nav>

      {/* Cabecera */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[c.status ?? "published"] ?? "bg-gray-100 text-gray-700"}`}>
            {STATUS_LABEL[c.status ?? "published"] ?? c.status}
          </span>
          <span className="text-xs text-gray-400">{labelContractType(c.contractType)}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 leading-snug mb-4">{c.title}</h1>
        {c.amount && (
          <div className="inline-block bg-brand-50 border border-brand-100 rounded-xl px-5 py-3">
            <p className="text-xs text-brand-600 font-medium uppercase tracking-wide">Importe adjudicado</p>
            <p className="text-3xl font-bold text-brand-700 mt-0.5">{fmt.format(Number(c.amount))}</p>
            <p className="text-xs text-brand-400 mt-0.5">IVA incluido</p>
          </div>
        )}
      </div>

      {/* 01 · Partes del contrato */}
      <Section number="01" title="Partes del contrato">
        <Row label="Organismo contratante">
          <span className="font-medium">Ayuntamiento de Ubrique</span>
          <span className="ml-2 text-xs text-gray-400">(Cádiz, Andalucía)</span>
        </Row>
        <Row label="Empresa adjudicataria">
          {c.awardedTo ? (
            <div>
              {empresaUrl ? (
                <a href={empresaUrl} className="font-medium text-brand-600 hover:underline">
                  {c.awardedTo}
                </a>
              ) : (
                <span className="font-medium">{c.awardedTo}</span>
              )}
              {c.awardedToNif && (
                <span className="ml-2 text-xs text-gray-400">NIF: {c.awardedToNif}</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 italic">Sin adjudicar</span>
          )}
        </Row>
      </Section>

      {/* 02 · Detalles del expediente */}
      <Section number="02" title="Detalles del expediente">
        <Row label="Tipo de contrato" value={labelContractType(c.contractType)} />
        <Row label="Ubicación" value="Ubrique, Cádiz" />
      </Section>

      {/* 03 · Fechas */}
      <Section number="03" title="Fechas">
        <Row label="Fecha de publicación" value={fmtDate(c.publishedDate)} />
        <Row label="Fecha de adjudicación" value={fmtDate(c.awardedDate)} />
      </Section>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        <a
          href="/contratos"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-lg px-4 py-2 transition-colors"
        >
          ← Volver a contratos
        </a>
        {c.sourceUrl && (
          <a
            href={c.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 border border-brand-200 bg-brand-50 rounded-lg px-4 py-2 transition-colors font-medium"
          >
            Ver expediente completo en PCSP ↗
          </a>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 px-6 py-3 text-sm border-b border-gray-100 last:border-0">
      <dt className="text-gray-500 font-medium">{label}</dt>
      <dd className="text-gray-900 break-all">{children ?? value ?? "—"}</dd>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <span className="text-xs font-bold text-brand-600 bg-brand-50 rounded-md px-2 py-0.5">{number}</span>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      </div>
      <dl>{children}</dl>
    </div>
  );
}
