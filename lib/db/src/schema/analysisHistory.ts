import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Stores a record of every AI analysis or report a user runs so it can be
// reopened later from the "Analysis History" page.
export const analysisHistoryTable = pgTable("analysis_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  type: text("type", {
    enum: ["log_analysis", "incident_report"],
  }).notNull(),
  title: text("title").notNull(),
  input: text("input").notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnalysisHistorySchema = createInsertSchema(
  analysisHistoryTable,
).omit({ id: true, createdAt: true });

export type InsertAnalysisHistory = z.infer<typeof insertAnalysisHistorySchema>;
export type AnalysisHistory = typeof analysisHistoryTable.$inferSelect;
