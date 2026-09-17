import { pgTable, uuid, text, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";

export const workflows = pgTable("workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  targetUrl: text("target_url").notNull(),
  taskDescription: text("task_description").notNull(),
  workflowGraph: jsonb("workflow_graph").notNull(), // the discovered steps/nodes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id").notNull().references(() => workflows.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | running | success | failed
  inputValues: jsonb("input_values"), // e.g. { query: "laptops", maxPrice: 800 }
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const results = pgTable("results", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull().references(() => runs.id),
  data: jsonb("data").notNull(), // the extracted structured output
  createdAt: timestamp("created_at").defaultNow().notNull(),
});