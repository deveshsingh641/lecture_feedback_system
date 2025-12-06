import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("student"),
  department: text("department"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teachers = pgTable("teachers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  department: text("department").notNull(),
  subject: text("subject").notNull(),
  averageRating: real("average_rating").default(0),
  totalFeedback: integer("total_feedback").default(0),
  bio: text("bio"),
  profileImage: text("profile_image"),
  officeHours: text("office_hours"),
  contactInfo: text("contact_info"),
  teachingPhilosophy: text("teaching_philosophy"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentName: text("student_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  subject: text("subject"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueFeedback: unique().on(table.teacherId, table.studentId),
}));

export const replies = pgTable("replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  feedbackId: varchar("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedbackAnalysis = pgTable("feedback_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  feedbackId: varchar("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }).unique(),
  sentiment: text("sentiment"), // "positive", "negative", "neutral"
  sentimentScore: real("sentiment_score"), // -1 to 1
  qualityScore: integer("quality_score"), // 1-10
  keywords: text("keywords"), // JSON array of extracted keywords
  analyzedAt: timestamp("analyzed_at").defaultNow(),
});

export const teacherSummaries = pgTable("teacher_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teacherId: varchar("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  strengths: text("strengths"), // JSON array
  improvements: text("improvements"), // JSON array
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const chatHistory = pgTable("chat_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teacherId: varchar("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueFavorite: unique().on(table.studentId, table.teacherId),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["student", "teacher"]),
  department: z.string().optional(),
});

export const insertTeacherSchema = createInsertSchema(teachers).omit({
  id: true,
  averageRating: true,
  totalFeedback: true,
  createdAt: true,
});

export const updateTeacherSchema = z.object({
  bio: z.string().optional(),
  profileImage: z.string().optional(),
  officeHours: z.string().optional(),
  contactInfo: z.string().optional(),
  teachingPhilosophy: z.string().optional(),
});

export const insertReplySchema = createInsertSchema(replies).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  studentName: true,
  studentId: true,
  subject: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type UpdateTeacher = z.infer<typeof updateTeacherSchema>;
export type Teacher = typeof teachers.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertReply = z.infer<typeof insertReplySchema>;
export type Reply = typeof replies.$inferSelect;
export type FeedbackAnalysis = typeof feedbackAnalysis.$inferSelect;
export type TeacherSummary = typeof teacherSummaries.$inferSelect;
export type ChatHistory = typeof chatHistory.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
