import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const contractStatusEnum = pgEnum("contract_status", [
  "published",
  "awarded",
  "cancelled",
  "in_progress",
]);

// ─── Contratos (Plataforma de Contratación del Sector Público) ───────────────

export const contracts = pgTable("contracts", {
  id:            serial("id").primaryKey(),
  externalId:    text("external_id").unique(),
  title:         text("title").notNull(),
  amount:        numeric("amount", { precision: 14, scale: 2 }),
  awardedTo:     text("awarded_to"),
  awardedToNif:  text("awarded_to_nif"),
  awardedDate:   timestamp("awarded_date"),
  publishedDate: timestamp("published_date"),
  contractType:  text("contract_type"),
  status:        contractStatusEnum("status").default("published"),
  sourceUrl:     text("source_url"),
  updatedAt:     timestamp("updated_at").defaultNow(),
});

// ─── Sueldos de cargos públicos ───────────────────────────────────────────────

export const salaries = pgTable("salaries", {
  id:         serial("id").primaryKey(),
  position:   text("position").notNull(),
  personName: text("person_name"),
  year:       integer("year").notNull(),
  total:      numeric("total", { precision: 12, scale: 2 }),
});

// ─── Presupuesto municipal ────────────────────────────────────────────────────

export const budgetLines = pgTable("budget_lines", {
  id:            serial("id").primaryKey(),
  year:          integer("year").notNull(),
  section:       text("section"),
  program:       text("program"),
  category:      text("category").notNull(),
  description:   text("description").notNull(),
  plannedAmount: numeric("planned_amount", { precision: 14, scale: 2 }),
}, (t) => [
  unique("budget_lines_unique").on(t.year, t.section, t.program, t.category),
]);
