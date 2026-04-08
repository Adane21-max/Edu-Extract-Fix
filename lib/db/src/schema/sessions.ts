import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { subjectsTable } from "./subjects";
import { questionsTable } from "./questions";

export const quizSessionsTable = pgTable("quiz_sessions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id),
  grade: text("grade").notNull(),
  status: text("status", { enum: ["in_progress", "completed"] }).notNull().default("in_progress"),
  score: integer("score"),
  totalQuestions: integer("total_questions").notNull().default(0),
  correctAnswers: integer("correct_answers"),
  timeTaken: integer("time_taken"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const sessionAnswersTable = pgTable("session_answers", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => quizSessionsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionsTable.id),
  selectedOption: text("selected_option", { enum: ["A", "B", "C", "D"] }),
  isCorrect: boolean("is_correct"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuizSessionSchema = createInsertSchema(quizSessionsTable).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertSessionAnswerSchema = createInsertSchema(sessionAnswersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertQuizSession = z.infer<typeof insertQuizSessionSchema>;
export type QuizSession = typeof quizSessionsTable.$inferSelect;
export type InsertSessionAnswer = z.infer<typeof insertSessionAnswerSchema>;
export type SessionAnswer = typeof sessionAnswersTable.$inferSelect;
