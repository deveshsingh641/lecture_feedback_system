import { 
  type User, type InsertUser, 
  type Teacher, type InsertTeacher, type UpdateTeacher,
  type Feedback, type InsertFeedback,
  type Reply, type InsertReply,
  type FeedbackAnalysis, type TeacherSummary, type ChatHistory,
  type Doubt, type InsertDoubt,
  users, teachers, feedback, replies, feedbackAnalysis, teacherSummaries, chatHistory, doubts
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getTeachers(): Promise<Teacher[]>;
  getTeacher(id: string): Promise<Teacher | undefined>;
  createTeacher(teacher: InsertTeacher): Promise<Teacher>;
  updateTeacher(id: string, updates: UpdateTeacher): Promise<Teacher>;
  deleteTeacher(id: string): Promise<void>;
  
  getFeedbackByTeacher(teacherId: string): Promise<Feedback[]>;
  getFeedbackByStudent(studentId: string): Promise<Feedback[]>;
  createFeedback(feedbackData: {
    teacherId: string;
    studentId: string;
    studentName: string;
    rating: number;
    comment?: string | null;
    subject?: string | null;
  }): Promise<Feedback>;
  hasFeedback(teacherId: string, studentId: string): Promise<boolean>;
  getStudentFeedbackTeachers(studentId: string): Promise<string[]>;
  
  getRepliesByFeedback(feedbackId: string): Promise<Reply[]>;
  createReply(replyData: InsertReply): Promise<Reply>;
  deleteReply(replyId: string, userId: string): Promise<void>;
  
  getFeedbackTrends(teacherId: string, startDate?: Date, endDate?: Date): Promise<Array<{ date: string; count: number; avgRating: number }>>;
  getDepartmentComparison(): Promise<Array<{ department: string; avgRating: number; totalFeedback: number }>>;
  getMonthlyPerformance(teacherId: string): Promise<Array<{ month: string; count: number; avgRating: number }>>;
  getTopRatedTeachers(limit?: number): Promise<Array<Teacher & { rank: number }>>;
  getMostFeedbackTeachers(limit?: number): Promise<Array<Teacher & { rank: number }>>;
  getMostImprovedTeachers(limit?: number): Promise<Array<Teacher & { rank: number; improvement: number }>>;
  getRecentActivity(limit?: number): Promise<Array<Feedback & { teacherName: string }>>;
  createDoubt(doubt: Omit<InsertDoubt, "teacherId" | "studentId" | "studentName"> & { teacherId: string; studentId: string; studentName: string }): Promise<Doubt>;
  getDoubtsByTeacher(teacherId: string): Promise<Doubt[]>;
  getDoubtsByStudent(studentId: string): Promise<Doubt[]>;
  answerDoubt(doubtId: string, answer: string): Promise<Doubt>;
  
  saveFeedbackAnalysis(data: {
    feedbackId: string;
    sentiment: string;
    sentimentScore: number;
    qualityScore: number;
    keywords: string;
  }): Promise<void>;
  getFeedbackAnalysis(feedbackId: string): Promise<FeedbackAnalysis | undefined>;
  saveTeacherSummary(data: {
    teacherId: string;
    summary: string;
    strengths: string;
    improvements: string;
  }): Promise<void>;
  getLatestTeacherSummary(teacherId: string): Promise<TeacherSummary | undefined>;
  saveChatMessage(data: {
    userId?: string;
    message: string;
    response: string;
  }): Promise<void>;
  getChatHistory(userId: string, limit?: number): Promise<ChatHistory[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
        username: insertUser.email.split("@")[0],
      })
      .returning();
    return user;
  }

  async getTeachers(): Promise<Teacher[]> {
    return db.select().from(teachers).orderBy(teachers.name);
  }

  async getTeacher(id: string): Promise<Teacher | undefined> {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id));
    return teacher;
  }

  async createTeacher(insertTeacher: InsertTeacher): Promise<Teacher> {
    const [teacher] = await db
      .insert(teachers)
      .values(insertTeacher)
      .returning();
    return teacher;
  }

  async updateTeacher(id: string, updates: UpdateTeacher): Promise<Teacher> {
    const [updated] = await db
      .update(teachers)
      .set(updates)
      .where(eq(teachers.id, id))
      .returning();
    if (!updated) throw new Error("Teacher not found");
    return updated;
  }

  async deleteTeacher(id: string): Promise<void> {
    await db.delete(teachers).where(eq(teachers.id, id));
  }

  async getFeedbackByTeacher(teacherId: string): Promise<Feedback[]> {
    return db
      .select()
      .from(feedback)
      .where(eq(feedback.teacherId, teacherId))
      .orderBy(desc(feedback.createdAt));
  }

  async getFeedbackByStudent(studentId: string): Promise<Feedback[]> {
    return db
      .select()
      .from(feedback)
      .where(eq(feedback.studentId, studentId))
      .orderBy(desc(feedback.createdAt));
  }

  async hasFeedback(teacherId: string, studentId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(feedback)
      .where(and(eq(feedback.teacherId, teacherId), eq(feedback.studentId, studentId)));
    return !!existing;
  }

  async getStudentFeedbackTeachers(studentId: string): Promise<string[]> {
    const result = await db
      .select({ teacherId: feedback.teacherId })
      .from(feedback)
      .where(eq(feedback.studentId, studentId));
    return result.map(r => r.teacherId);
  }

  async createFeedback(feedbackData: {
        teacherId: string;
        studentId: string;
        studentName: string;
        rating: number;
        comment?: string | null;
        subject?: string | null;
      }): Promise<Feedback> {
    const [newFeedback] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();
    
    // Update teacher's average rating
    const allFeedback = await this.getFeedbackByTeacher(feedbackData.teacherId);
    const avgRating = allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length;
    
    await db
      .update(teachers)
      .set({
        averageRating: avgRating,
        totalFeedback: allFeedback.length,
      })
      .where(eq(teachers.id, feedbackData.teacherId));

    return newFeedback;
  }

  async getRepliesByFeedback(feedbackId: string): Promise<Reply[]> {
    return db
      .select()
      .from(replies)
      .where(eq(replies.feedbackId, feedbackId))
      .orderBy(replies.createdAt);
  }

  async createReply(replyData: InsertReply): Promise<Reply> {
    const [newReply] = await db
      .insert(replies)
      .values(replyData)
      .returning();
    return newReply;
  }

  async deleteReply(replyId: string, userId: string): Promise<void> {
    await db
      .delete(replies)
      .where(and(eq(replies.id, replyId), eq(replies.userId, userId)));
  }

  async getFeedbackTrends(teacherId: string, startDate?: Date, endDate?: Date): Promise<Array<{ date: string; count: number; avgRating: number }>> {
    const conditions = [eq(feedback.teacherId, teacherId)];
    
    if (startDate) {
      conditions.push(gte(feedback.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(feedback.createdAt, endDate));
    }

    return db
      .select({
        date: sql<string>`DATE(${feedback.createdAt})`,
        count: sql<number>`COUNT(*)::int`,
        avgRating: sql<number>`AVG(${feedback.rating})::real`,
      })
      .from(feedback)
      .where(and(...conditions))
      .groupBy(sql`DATE(${feedback.createdAt})`)
      .orderBy(sql`DATE(${feedback.createdAt})`);
  }

  async getDepartmentComparison(): Promise<Array<{ department: string; avgRating: number; totalFeedback: number }>> {
    return db
      .select({
        department: teachers.department,
        avgRating: sql<number>`AVG(${teachers.averageRating})::real`,
        totalFeedback: sql<number>`SUM(${teachers.totalFeedback})::int`,
      })
      .from(teachers)
      .groupBy(teachers.department);
  }

  async getMonthlyPerformance(teacherId: string): Promise<Array<{ month: string; count: number; avgRating: number }>> {
    return db
      .select({
        month: sql<string>`TO_CHAR(${feedback.createdAt}, 'YYYY-MM')`,
        count: sql<number>`COUNT(*)::int`,
        avgRating: sql<number>`AVG(${feedback.rating})::real`,
      })
      .from(feedback)
      .where(eq(feedback.teacherId, teacherId))
      .groupBy(sql`TO_CHAR(${feedback.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${feedback.createdAt}, 'YYYY-MM')`);
  }

  async getTopRatedTeachers(limit: number = 10): Promise<Array<Teacher & { rank: number }>> {
    const topTeachers = await db
      .select()
      .from(teachers)
      .where(sql`${teachers.averageRating} > 0`)
      .orderBy(desc(teachers.averageRating), desc(teachers.totalFeedback))
      .limit(limit);

    return topTeachers.map((teacher, index) => ({
      ...teacher,
      rank: index + 1,
    }));
  }

  async getMostFeedbackTeachers(limit: number = 10): Promise<Array<Teacher & { rank: number }>> {
    const topTeachers = await db
      .select()
      .from(teachers)
      .where(sql`${teachers.totalFeedback} > 0`)
      .orderBy(desc(teachers.totalFeedback), desc(teachers.averageRating))
      .limit(limit);

    return topTeachers.map((teacher, index) => ({
      ...teacher,
      rank: index + 1,
    }));
  }

  async getMostImprovedTeachers(limit: number = 10): Promise<Array<Teacher & { rank: number; improvement: number }>> {
    // Simplified version: Teachers with increasing average ratings
    // In production, you'd compare recent period vs previous period
    const teachers = await this.getTeachers();
    
    // For now, return teachers sorted by recent positive trend
    // This is a placeholder - you can enhance this with actual time-based comparison
    const improved = teachers
      .filter((teacher) => teacher.averageRating && teacher.averageRating > 0 && teacher.totalFeedback && teacher.totalFeedback >= 3)
      .sort((a, b) => {
        // Sort by rating improvement potential (higher rating with more feedback = more stable improvement)
        const scoreA = (a.averageRating || 0) * Math.log((a.totalFeedback || 0) + 1);
        const scoreB = (b.averageRating || 0) * Math.log((b.totalFeedback || 0) + 1);
        return scoreB - scoreA;
      })
      .slice(0, limit)
      .map((teacher, index) => ({
        ...teacher,
        rank: index + 1,
        improvement: (teacher.averageRating || 0) * 0.1, // Placeholder improvement value
      }));

    return improved;
  }

  async getRecentActivity(limit: number = 10): Promise<Array<Feedback & { teacherName: string }>> {
    const recentFeedback = await db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt))
      .limit(limit);

    // Get teacher names for each feedback
    const feedbackWithTeachers = await Promise.all(
      recentFeedback.map(async (fb) => {
        const teacher = await this.getTeacher(fb.teacherId);
        return {
          ...fb,
          teacherName: teacher?.name || "Unknown Teacher",
        };
      })
    );

    return feedbackWithTeachers;
  }

  async createDoubt(doubtData: Omit<InsertDoubt, "teacherId" | "studentId" | "studentName"> & { teacherId: string; studentId: string; studentName: string }): Promise<Doubt> {
    const [newDoubt] = await db
      .insert(doubts)
      .values(doubtData)
      .returning();
    return newDoubt;
  }

  async getDoubtsByTeacher(teacherId: string): Promise<Doubt[]> {
    return db
      .select()
      .from(doubts)
      .where(eq(doubts.teacherId, teacherId))
      .orderBy(desc(doubts.createdAt));
  }

  async getDoubtsByStudent(studentId: string): Promise<Doubt[]> {
    return db
      .select()
      .from(doubts)
      .where(eq(doubts.studentId, studentId))
      .orderBy(desc(doubts.createdAt));
  }

  async answerDoubt(doubtId: string, answer: string): Promise<Doubt> {
    const [updated] = await db
      .update(doubts)
      .set({
        answer,
        status: "answered",
        answeredAt: new Date(),
      })
      .where(eq(doubts.id, doubtId))
      .returning();

    if (!updated) throw new Error("Doubt not found");
    return updated;
  }

  async saveFeedbackAnalysis(data: {
    feedbackId: string;
    sentiment: string;
    sentimentScore: number;
    qualityScore: number;
    keywords: string;
  }): Promise<void> {
    await db
      .insert(feedbackAnalysis)
      .values(data)
      .onConflictDoUpdate({
        target: feedbackAnalysis.feedbackId,
        set: {
          sentiment: data.sentiment,
          sentimentScore: data.sentimentScore,
          qualityScore: data.qualityScore,
          keywords: data.keywords,
          analyzedAt: new Date(),
        },
      });
  }

  async getFeedbackAnalysis(feedbackId: string): Promise<FeedbackAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(feedbackAnalysis)
      .where(eq(feedbackAnalysis.feedbackId, feedbackId));
    return analysis;
  }

  async saveTeacherSummary(data: {
    teacherId: string;
    summary: string;
    strengths: string;
    improvements: string;
  }): Promise<void> {
    await db.insert(teacherSummaries).values(data);
  }

  async getLatestTeacherSummary(teacherId: string): Promise<TeacherSummary | undefined> {
    const [summary] = await db
      .select()
      .from(teacherSummaries)
      .where(eq(teacherSummaries.teacherId, teacherId))
      .orderBy(desc(teacherSummaries.generatedAt))
      .limit(1);
    return summary;
  }

  async saveChatMessage(data: {
    userId?: string;
    message: string;
    response: string;
  }): Promise<void> {
    await db.insert(chatHistory).values({
      userId: data.userId || null,
      message: data.message,
      response: data.response,
    });
  }

  async getChatHistory(userId: string, limit: number = 10): Promise<ChatHistory[]> {
    return db
      .select()
      .from(chatHistory)
      .where(eq(chatHistory.userId, userId))
      .orderBy(desc(chatHistory.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
