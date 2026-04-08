import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { quizSessionsTable } from "./sessions";

export const aiFeedbackTable = pgTable("ai_feedback", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().unique().references(() => quizSessionsTable.id, { onDelete: "cascade" }),
  summary: text("summary"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  recommendations: text("recommendations"),
  questionFeedback: text("question_feedback"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiFeedbackSchema = createInsertSchema(aiFeedbackTable).omit({
  id: true,
  generatedAt: true,
});

export type InsertAiFeedback = z.infer<typeof insertAiFeedbackSchema>;
export type AiFeedback = typeof aiFeedbackTable.$inferSelect;
