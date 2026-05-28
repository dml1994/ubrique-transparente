import { db } from "@/db";
import { budgetLines } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";

export type BudgetRow = typeof budgetLines.$inferSelect;

export async function getBudgetLines(year?: number): Promise<BudgetRow[]> {
  return db
    .select()
    .from(budgetLines)
    .where(year ? eq(budgetLines.year, year) : undefined)
    .orderBy(asc(budgetLines.section), asc(budgetLines.program), asc(budgetLines.category));
}

export async function getBudgetYears(): Promise<number[]> {
  const result = await db.execute(
    sql`SELECT DISTINCT year FROM budget_lines ORDER BY year DESC`
  );
  return (result.rows as Array<{ year: number }>).map((r) => r.year);
}

export async function getBudgetStats(year?: number) {
  const result = await db.execute(
    sql`SELECT
          section,
          COALESCE(SUM(planned_amount), 0) AS planned,
          COUNT(*) AS lines
        FROM budget_lines
        ${year ? sql`WHERE year = ${year}` : sql``}
        GROUP BY section`
  );
  const rows = result.rows as Array<{ section: string; planned: string; lines: string }>;
  const gastos   = rows.find((r) => r.section === "Gastos");
  const ingresos = rows.find((r) => r.section === "Ingresos");
  return {
    gastos:   Number(gastos?.planned   ?? 0),
    ingresos: Number(ingresos?.planned ?? 0),
    lines:    rows.reduce((s, r) => s + Number(r.lines), 0),
  };
}
