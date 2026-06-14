import { db } from "@/db";
import { sql } from "drizzle-orm";

export type CompanyRow = {
  nif: string;
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
    WITH base AS (
      SELECT *,
        TRIM(REGEXP_REPLACE(
          REGEXP_REPLACE(
            UPPER(TRIM(awarded_to)),
            '([[:space:],]+(SLU|SAU|SL|SA|S[.]L[.]U[.]?|S[.]L[.]?|S[.]A[.]U[.]?|S[.]A[.]?)[[:space:],.]*)$',
            ''
          ),
          '[^A-Z0-9 ]', '', 'g'
        )) AS norm_name
      FROM contracts
      WHERE awarded_to IS NOT NULL AND awarded_to <> ''
      ${yearFilter}
    ),
    enriched AS (
      SELECT *,
        COALESCE(
          awarded_to_nif,
          MAX(awarded_to_nif) OVER (PARTITION BY norm_name),
          norm_name
        ) AS group_key
      FROM base
    )
    SELECT
      group_key                                                         AS nif,
      (ARRAY_AGG(awarded_to ORDER BY COALESCE(amount, 0) DESC))[1]     AS name,
      COUNT(*)::int                                                     AS contracts,
      COALESCE(SUM(amount), 0)::float                                   AS total_amount,
      MIN(EXTRACT(YEAR FROM COALESCE(awarded_date, published_date)))::int AS first_year,
      MAX(EXTRACT(YEAR FROM COALESCE(awarded_date, published_date)))::int AS last_year
    FROM enriched
    GROUP BY group_key
    ORDER BY total_amount DESC NULLS LAST, contracts DESC
    LIMIT 100
  `);

  return (result.rows as Array<{
    nif: string; name: string; contracts: number; total_amount: number;
    first_year: number | null; last_year: number | null;
  }>).map((r) => ({
    nif:         r.nif,
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
    SELECT COUNT(DISTINCT group_key)::int AS total, COALESCE(SUM(amount), 0)::float AS total_amount
    FROM (
      WITH base AS (
        SELECT amount,
          TRIM(REGEXP_REPLACE(
            REGEXP_REPLACE(
              UPPER(TRIM(awarded_to)),
              '([[:space:],]+(SLU|SAU|SL|SA|S[.]L[.]U[.]?|S[.]L[.]?|S[.]A[.]U[.]?|S[.]A[.]?)[[:space:],.]*)$',
              ''
            ),
            '[^A-Z0-9 ]', '', 'g'
          )) AS norm_name,
          awarded_to_nif
        FROM contracts
        WHERE awarded_to IS NOT NULL AND awarded_to <> ''
        ${yearFilter}
      )
      SELECT
        COALESCE(
          awarded_to_nif,
          MAX(awarded_to_nif) OVER (PARTITION BY norm_name),
          norm_name
        ) AS group_key,
        amount
      FROM base
    ) sub
  `);

  const row = result.rows[0] as { total: number; total_amount: number };
  return { total: row.total, totalAmount: row.total_amount };
}

export type CompanyDetail = {
  nif: string;
  name: string;
  contracts: number;
  totalAmount: number;
  firstYear: number | null;
  lastYear: number | null;
  rows: Array<{
    id: number;
    title: string;
    amount: string | null;
    awardedDate: Date | null;
    publishedDate: Date | null;
    contractType: string | null;
    status: string | null;
    sourceUrl: string | null;
  }>;
};

export async function getCompanyDetail(nif: string): Promise<CompanyDetail | null> {
  const enrichedCte = sql`
    WITH base AS (
      SELECT *,
        TRIM(REGEXP_REPLACE(
          REGEXP_REPLACE(
            UPPER(TRIM(awarded_to)),
            '([[:space:],]+(SLU|SAU|SL|SA|S[.]L[.]U[.]?|S[.]L[.]?|S[.]A[.]U[.]?|S[.]A[.]?)[[:space:],.]*)$',
            ''
          ),
          '[^A-Z0-9 ]', '', 'g'
        )) AS norm_name
      FROM contracts
      WHERE awarded_to IS NOT NULL AND awarded_to <> ''
    ),
    enriched AS (
      SELECT *,
        COALESCE(
          awarded_to_nif,
          MAX(awarded_to_nif) OVER (PARTITION BY norm_name),
          norm_name
        ) AS group_key
      FROM base
    )
  `;

  const result = await db.execute(sql`
    ${enrichedCte}
    SELECT id, title, amount, awarded_date, published_date, contract_type, status, source_url
    FROM enriched
    WHERE group_key = ${nif}
    ORDER BY COALESCE(awarded_date, published_date) DESC NULLS LAST
  `);

  if (result.rows.length === 0) return null;

  const rows = result.rows as Array<{
    id: number; title: string; amount: string | null;
    awarded_date: string | null; published_date: string | null;
    contract_type: string | null; status: string | null; source_url: string | null;
  }>;

  const summary = await db.execute(sql`
    ${enrichedCte}
    SELECT
      (ARRAY_AGG(awarded_to ORDER BY COALESCE(amount, 0) DESC))[1] AS name,
      COUNT(*)::int                                                  AS contracts,
      COALESCE(SUM(amount), 0)::float                               AS total_amount,
      MIN(EXTRACT(YEAR FROM COALESCE(awarded_date, published_date)))::int AS first_year,
      MAX(EXTRACT(YEAR FROM COALESCE(awarded_date, published_date)))::int AS last_year
    FROM enriched
    WHERE group_key = ${nif}
  `);

  const s = summary.rows[0] as {
    name: string; contracts: number; total_amount: number;
    first_year: number | null; last_year: number | null;
  };

  return {
    nif,
    name:        s.name,
    contracts:   s.contracts,
    totalAmount: s.total_amount,
    firstYear:   s.first_year,
    lastYear:    s.last_year,
    rows: rows.map((r) => ({
      id:            r.id,
      title:         r.title,
      amount:        r.amount,
      awardedDate:   r.awarded_date ? new Date(r.awarded_date) : null,
      publishedDate: r.published_date ? new Date(r.published_date) : null,
      contractType:  r.contract_type,
      status:        r.status,
      sourceUrl:     r.source_url,
    })),
  };
}
