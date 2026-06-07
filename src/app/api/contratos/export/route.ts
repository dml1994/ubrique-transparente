import { NextRequest, NextResponse } from "next/server";
import { getContractsForExport, labelContractType } from "@/lib/contracts";
import type { ContractsFilter } from "@/lib/contracts";

const STATUS_LABEL: Record<string, string> = {
  awarded:     "Adjudicada",
  published:   "Publicada",
  cancelled:   "Anulada",
  in_progress: "En tramitación",
};

function fmtDate(val: string | Date | null | undefined): string {
  if (!val) return "";
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toISOString().slice(0, 10);
}

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const filters: ContractsFilter = {
    q:            sp.get("q")            ?? undefined,
    year:         sp.get("year")         ?? undefined,
    type:         sp.get("type")         ?? undefined,
    status:       sp.get("status")       ?? undefined,
    adjudicataria: sp.get("adjudicataria") ?? undefined,
    sort:         sp.get("sort")         ?? undefined,
    order:        (sp.get("order") as "asc" | "desc") ?? undefined,
  };

  const rows = await getContractsForExport(filters);

  const headers = ["ID", "Título", "Adjudicataria", "NIF", "Importe (€)", "Tipo", "Fecha publicación", "Fecha adjudicación", "Estado"];
  const lines = [
    headers.join(","),
    ...rows.map((c) =>
      [
        escapeCSV(String(c.id)),
        escapeCSV(c.title),
        escapeCSV(c.awardedTo),
        escapeCSV(c.awardedToNif),
        escapeCSV(c.amount ? Number(c.amount).toFixed(2) : ""),
        escapeCSV(labelContractType(c.contractType)),
        escapeCSV(fmtDate(c.publishedDate)),
        escapeCSV(fmtDate(c.awardedDate)),
        escapeCSV(STATUS_LABEL[c.status ?? ""] ?? c.status ?? ""),
      ].join(",")
    ),
  ];

  const csv = lines.join("\n");
  const filename = `contratos-ubrique-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
