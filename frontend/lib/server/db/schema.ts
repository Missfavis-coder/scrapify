import { generatePublicId } from "@/lib/utils/public-id";
import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    jsonb,
    integer,
    boolean,
  } from "drizzle-orm/pg-core";
  
  // Users
  export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 255 }),
    emailVerifiedAt: timestamp("email_verified_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  });
  


// Automations
export const automations = pgTable("automations", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),

  publicId: varchar("public_id", { length: 20 })
    .$defaultFn(() => generatePublicId())
    .notNull()
    .unique(),

  description: text("description"),
  instructions: text("instructions").notNull(),

  status: varchar("status", { length: 30 }).default("draft").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

  
  // Executions
  
  export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),

  automationId: uuid("automation_id")
    .notNull()
    .references(() => automations.id, { onDelete: "cascade" }),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  status: varchar("status", { length: 30 }).default("queued").notNull(),
  stage: varchar("stage", { length: 40 }).default("queued").notNull(),
  progress: integer("progress").default(0).notNull(),
  currentAction: text("current_action"),

  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),

  error: text("error"),
  errorCode: varchar("error_code", { length: 100 }),
  errorDetail: text("error_detail"),

  cancelRequestedAt: timestamp("cancel_requested_at", {
    withTimezone: true,
  }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
    });

  
  // Execution logs
  export const executionLogs = pgTable("execution_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    level: varchar("level", { length: 20 }).default("info").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  });
  
  // Extracted artifacts
  export const artifacts = pgTable("artifacts", {
    id: uuid("id").defaultRandom().primaryKey(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }),
    content: jsonb("content"),
    storageUrl: text("storage_url"),
    itemCount: integer("item_count"),
    isPublic: boolean("is_public").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  });


// Reusable workflows
export const workflows = pgTable("workflows", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  steps: jsonb("steps")
    .$type<Array<{
      id: string;
      action: string;
      instruction: string;
    }>>()
    .default([])
    .notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
