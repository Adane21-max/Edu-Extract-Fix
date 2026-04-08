import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  grade: text("grade").notNull(),
  status: text("status", { enum: ["pending", "approved", "suspended"] }).notNull().default("pending"),
  subscriptionTier: text("subscription_tier", {
    enum: ["none", "grade6", "grade7", "grade8", "grade9", "grade10", "grade11", "grade12"],
  }).notNull().default("none"),
  subscriptionPrice: integer("subscription_price"),
  telebirrReceipt: text("telebirr_receipt"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
