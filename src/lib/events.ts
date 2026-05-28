import { db } from "@/db";
import { events, contracts } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export type EventRow = typeof events.$inferSelect & { contractCount: number };

export async function getEvents(): Promise<EventRow[]> {
  const result = await db
    .select({
      id:          events.id,
      name:        events.name,
      year:        events.year,
      description: events.description,
      totalAmount: events.totalAmount,
      approvedByAdmin: events.approvedByAdmin,
      createdAt:   events.createdAt,
      contractCount: sql<number>`COUNT(${contracts.id})::int`,
    })
    .from(events)
    .leftJoin(contracts, eq(contracts.eventId, events.id))
    .groupBy(events.id)
    .orderBy(desc(events.year), events.name);
  return result as EventRow[];
}

export async function getEventById(id: number) {
  const [event] = await db.select().from(events).where(eq(events.id, id));
  return event ?? null;
}

export async function getEventContracts(eventId: number) {
  return db
    .select()
    .from(contracts)
    .where(eq(contracts.eventId, eventId))
    .orderBy(desc(contracts.amount));
}
