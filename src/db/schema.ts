import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  real,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const contractStatusEnum = pgEnum("contract_status", [
  "published",
  "awarded",
  "cancelled",
  "in_progress",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "pending",
  "approved",
  "rejected",
]);

// ─── Eventos ─────────────────────────────────────────────────────────────────

export const events = pgTable("events", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  year:        integer("year").notNull(),
  description: text("description"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }),
  approvedByAdmin: boolean("approved_by_admin").default(false),
  createdAt:   timestamp("created_at").defaultNow(),
});

// ─── Contratos (Plataforma de Contratación del Sector Público) ───────────────

export const contracts = pgTable("contracts", {
  id:             serial("id").primaryKey(),
  externalId:     text("external_id").unique(),           // ID del feed PCSP
  title:          text("title").notNull(),
  description:    text("description"),
  amount:         numeric("amount", { precision: 14, scale: 2 }),
  awardedTo:      text("awarded_to"),
  awardedToNif:   text("awarded_to_nif"),
  awardedDate:    timestamp("awarded_date"),
  publishedDate:  timestamp("published_date"),
  contractType:   text("contract_type"),
  cpvCode:        text("cpv_code"),
  cpvDescription: text("cpv_description"),
  status:         contractStatusEnum("status").default("published"),
  sourceUrl:      text("source_url"),
  rawXml:         text("raw_xml"),
  eventId:        integer("event_id").references(() => events.id),
  createdAt:      timestamp("created_at").defaultNow(),
  updatedAt:      timestamp("updated_at").defaultNow(),
});

// ─── Sueldos de cargos públicos ───────────────────────────────────────────────

export const salaries = pgTable("salaries", {
  id:            serial("id").primaryKey(),
  position:      text("position").notNull(),
  personName:    text("person_name"),
  year:          integer("year").notNull(),
  grossAnnual:   numeric("gross_annual", { precision: 12, scale: 2 }),
  allowances:    numeric("allowances",   { precision: 12, scale: 2 }),
  extras:        numeric("extras",       { precision: 12, scale: 2 }),
  total:         numeric("total",        { precision: 12, scale: 2 }),
  sourceUrl:     text("source_url"),
  sourceDoc:     text("source_doc"),
  createdAt:     timestamp("created_at").defaultNow(),
});

// ─── Presupuesto municipal ────────────────────────────────────────────────────

export const budgetLines = pgTable("budget_lines", {
  id:              serial("id").primaryKey(),
  year:            integer("year").notNull(),
  section:         text("section"),
  program:         text("program"),
  category:        text("category").notNull(),
  description:     text("description").notNull(),
  plannedAmount:   numeric("planned_amount",   { precision: 14, scale: 2 }),
  executedAmount:  numeric("executed_amount",  { precision: 14, scale: 2 }),
  sourceUrl:       text("source_url"),
  createdAt:       timestamp("created_at").defaultNow(),
}, (t) => [
  unique("budget_lines_unique").on(t.year, t.section, t.program, t.category),
]);

// ─── Propuestas de clasificación por IA (eventos) ────────────────────────────

export const eventProposals = pgTable("event_proposals", {
  id:            serial("id").primaryKey(),
  contractId:    integer("contract_id").notNull().references(() => contracts.id),
  eventId:       integer("event_id").notNull().references(() => events.id),
  aiConfidence:  real("ai_confidence"),       // 0.0 – 1.0
  aiReasoning:   text("ai_reasoning"),
  status:        proposalStatusEnum("status").default("pending"),
  reviewedAt:    timestamp("reviewed_at"),
  createdAt:     timestamp("created_at").defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const eventsRelations = relations(events, ({ many }) => ({
  contracts: many(contracts),
  proposals: many(eventProposals),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  event:     one(events, { fields: [contracts.eventId], references: [events.id] }),
  proposals: many(eventProposals),
}));

export const eventProposalsRelations = relations(eventProposals, ({ one }) => ({
  contract: one(contracts, { fields: [eventProposals.contractId], references: [contracts.id] }),
  event:    one(events,    { fields: [eventProposals.eventId],    references: [events.id]    }),
}));
