import { db } from "@/db";
import { salaries } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export type SalaryRow = typeof salaries.$inferSelect;

export async function getSalaries(year?: number): Promise<SalaryRow[]> {
  return db
    .select()
    .from(salaries)
    .where(year ? eq(salaries.year, year) : undefined)
    .orderBy(desc(salaries.total));
}

export async function getSalaryYears(): Promise<number[]> {
  const result = await db.execute(
    sql`SELECT DISTINCT year FROM salaries ORDER BY year DESC`
  );
  return (result.rows as Array<{ year: number }>).map((r) => r.year);
}

export async function getSalaryStats(year?: number) {
  const [stats] = await db
    .select({
      total:       sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(total), 0)`,
    })
    .from(salaries)
    .where(year ? eq(salaries.year, year) : undefined);
  return stats;
}
