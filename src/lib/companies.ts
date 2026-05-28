import { db } from "@/db";
import { sql } from "drizzle-orm";

export type CompanyRow = {
  name: string;
  contracts: number;
  totalAmount: number;
  firstYear: number | null;
  lastYear: number | null;
};

export type CompanyStats = {
  total: number;
  totalAmount: number;
};

export async function getCompanies(year?: number): Promise<CompanyRow[]> {
  const yearFilter = year
    ? sql`AND EXTRACT(YEAR FROM COALESCE(awarded_date, published_date)) = ${year}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      -- NIF como clave; para contratos sin NIF usamos nombre normalizado
      COALESCE(awarded_to_nif,
        REGEXP_REPLACE(UPPER(TRIM(awarded_to)), '[^A-Z0-9 ]', '', 'g')
      )                                                                 AS nif,
      -- Nombre canónico: la grafía de mayor importe
      (ARRAY_AGG(awarded_to ORDER BY COALESCE(amount, 0) DESC))[1]     AS name,
      COUNT(*)::int                                                     AS contracts,
      COALESCE(SUM(amount), 0)::float                                   AS total_amount,
      MIN(EXTRACT(YEAR FROM COALESCE(awarded_date, published_date)))::int AS first_year,
      MAX(EXTRACT(YEAR FROM COALESCE(awarded_date, published_date)))::int AS last_year
    FROM contracts
    WHERE awarded_to IS NOT NULL AND awarded_to <> ''
    ${yearFilter}
    GROUP BY nif
    ORDER BY total_amount DESC NULLS LAST, contracts DESC
    LIMIT 100
  `);

  return (result.rows as Array<{
    name: string; contracts: number; total_amount: number;
    first_year: number | null; last_year: number | null;
  }>).map((r) => ({
    name:        r.name,
    contracts:   r.contracts,
    totalAmount: r.total_amount,
    firstYear:   r.first_year,
    lastYear:    r.last_year,
  }));
}

export async function getCompanyYears(): Promise<number[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(awarded_date, published_date))::int AS year
    FROM contracts
    WHERE awarded_to IS NOT NULL AND COALESCE(awarded_date, published_date) IS NOT NULL
    ORDER BY year DESC
  `);
  return (result.rows as Array<{ year: number }>).map((r) => r.year);
}

export async function getCompanyStats(year?: number): Promise<CompanyStats> {
  const yearFilter = year
    ? sql`AND EXTRACT(YEAR FROM COALESCE(awarded_date, published_date)) = ${year}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      COUNT(DISTINCT COALESCE(awarded_to_nif,
        REGEXP_REPLACE(UPPER(TRIM(awarded_to)), '[^A-Z0-9 ]', '', 'g')
      ))::int         AS total,
      COALESCE(SUM(amount), 0)::float AS total_amount
    FROM contracts
    WHERE awarded_to IS NOT NULL AND awarded_to <> ''
    ${yearFilter}
  `);

  const row = result.rows[0] as { total: number; total_amount: number };
  return { total: row.total, totalAmount: row.total_amount };
}
