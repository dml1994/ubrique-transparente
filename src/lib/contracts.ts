import { db } from "@/db";
import { contracts } from "@/db/schema";
import { desc, asc, ilike, eq, and, sql, or } from "drizzle-orm";

export type ContractRow = typeof contracts.$inferSelect;

export type ContractsFilter = {
  q?: string;
  year?: string;
  type?: string;
  adjudicataria?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: string;
};

const PAGE_SIZE = 25;

const CONTRACT_TYPE_MAP: Record<string, string> = {
  "1":  "Suministros",
  "2":  "Gestión de servicios públicos",
  "3":  "Obras",
  "4":  "Concesión de obras",
  "5":  "Concesión de servicios",
  "7":  "Servicios especiales",
  "8":  "Servicios",
  "21": "Administrativo especial",
  "31": "Privado",
  "50": "Patrimonial",
  "51": "Otro",
};

export function labelContractType(code: string | null): string {
  if (!code) return "—";
  return CONTRACT_TYPE_MAP[code] ?? code;
}

export async function getContracts(filters: ContractsFilter) {
  const page = Math.min(500, Math.max(1, parseInt(filters.page ?? "1", 10)));
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];

  if (filters.q) {
    const q = filters.q.slice(0, 120);
    const term = `%${q}%`;
    conditions.push(
      or(
        ilike(contracts.title, term),
        ilike(contracts.awardedTo, term),
        ilike(contracts.cpvDescription, term),
      )
    );
  }

  if (filters.year) {
    conditions.push(
      sql`EXTRACT(YEAR FROM COALESCE(${contracts.awardedDate}, ${contracts.publishedDate})) = ${parseInt(filters.year, 10)}`
    );
  }

  if (filters.type) {
    conditions.push(eq(contracts.contractType, filters.type));
  }

  if (filters.adjudicataria) {
    conditions.push(eq(contracts.awardedTo, filters.adjudicataria));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const sortCol =
    filters.sort === "amount"
      ? contracts.amount
      : filters.sort === "awardedDate"
        ? contracts.awardedDate
        : contracts.publishedDate;

  const orderFn = filters.order === "asc" ? asc : desc;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(contracts)
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(contracts)
      .where(where),
  ]);

  return {
    rows,
    total: Number(count),
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(Number(count) / PAGE_SIZE),
  };
}

export async function getContractStats() {
  const [stats] = await db
    .select({
      total:       sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(${contracts.amount}), 0)`,
      lastUpdated: sql<string>`MAX(${contracts.updatedAt})`,
    })
    .from(contracts);
  return stats;
}

export async function getYearStats(): Promise<Array<{ year: number; total: number; amount: number }>> {
  const result = await db.execute(
    sql`SELECT
          EXTRACT(YEAR FROM COALESCE(awarded_date, published_date))::int AS year,
          COUNT(*)::int                                                   AS total,
          COALESCE(SUM(amount), 0)::float                                AS amount
        FROM contracts
        WHERE COALESCE(awarded_date, published_date) IS NOT NULL
        GROUP BY year
        ORDER BY year DESC`
  );
  return result.rows as Array<{ year: number; total: number; amount: number }>;
}

export async function getDistinctTypes(): Promise<string[]> {
  const result = await db.execute(
    sql`SELECT DISTINCT contract_type
        FROM contracts
        WHERE contract_type IS NOT NULL
        ORDER BY contract_type`
  );
  return (result.rows as Array<{ contract_type: string }>).map((r) => r.contract_type);
}
