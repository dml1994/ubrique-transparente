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
  const [stats] = await db
    .select({
      planned:  sql<number>`COALESCE(SUM(planned_amount), 0)`,
      executed: sql<number>`COALESCE(SUM(executed_amount), 0)`,
      lines:    sql<number>`COUNT(*)`,
    })
    .from(budgetLines)
    .where(year ? eq(budgetLines.year, year) : undefined);
  return stats;
}
