import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, signupSchema, insertTeacherSchema, insertFeedbackSchema, updateTeacherSchema, insertReplySchema, feedback, doubts, teachers } from "@shared/schema";
import { aiService } from "./ai-service";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { eq, and, lte, desc } from "drizzle-orm";
import multer from "multer";
import OpenAI from "openai";

const JWT_SECRET = process.env.SESSION_SECRET || "edufeedback-secret-key";

const DEFAULT_ABUSIVE_WORDS = ["idiot", "stupid", "dumb", "bastard", "bloody", "fuck", "shit"];
const ENV_ABUSE_WORDS = process.env.ABUSE_WORDS
  ? process.env.ABUSE_WORDS.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean)
  : [];
const ABUSIVE_WORDS = ENV_ABUSE_WORDS.length > 0 ? ENV_ABUSE_WORDS : DEFAULT_ABUSIVE_WORDS;

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
});

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as AuthRequest["user"];
    req.user = user;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const user = await storage.createUser({
        ...data,
        username: data.email.split("@")[0],
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Favorites Routes
  app.get("/api/favorites/my", authenticateToken, requireRole("student"), async (req: AuthRequest, res) => {
    try {
      const items = await storage.getFavoritesByStudent(req.user!.id);
      res.json(items.map((f) => f.teacherId));
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({ error: "Failed to get favorites" });
    }
  });

  app.post("/api/favorites/:teacherId", authenticateToken, requireRole("student"), async (req: AuthRequest, res) => {
    try {
      const { teacherId } = req.params;
      const favorite = await storage.addFavorite(req.user!.id, teacherId);
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Add favorite error:", error);
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites/:teacherId", authenticateToken, requireRole("student"), async (req: AuthRequest, res) => {
    try {
      const { teacherId } = req.params;
      await storage.removeFavorite(req.user!.id, teacherId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove favorite error:", error);
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  // Doubt Wall Routes
  app.get("/api/doubts/my", authenticateToken, requireRole("student"), async (req: AuthRequest, res) => {
    try {
      const items = await storage.getDoubtsByStudent(req.user!.id);
      res.json(items);
    } catch (error) {
      console.error("Get student doubts error:", error);
      res.status(500).json({ error: "Failed to get doubts" });
    }
  });

  app.get("/api/doubts/teacher", authenticateToken, requireRole("teacher"), async (req: AuthRequest, res) => {
    try {
      // For now, teachers see all doubts; in a more advanced linking, we'd filter by teacher user
      const teacherList = await storage.getTeachers();
      const allDoubts = [] as any[];
      for (const t of teacherList) {
        const doubts = await storage.getDoubtsByTeacher(t.id);
        allDoubts.push(...doubts.map((d) => ({ ...d, teacherName: t.name })));
      }
      allDoubts.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      res.json(allDoubts);
    } catch (error) {
      console.error("Get teacher doubts error:", error);
      res.status(500).json({ error: "Failed to get doubts" });
    }
  });

  app.post("/api/doubts/:id/answer", authenticateToken, requireRole("teacher", "admin"), async (req: AuthRequest, res) => {
    try {
      const { answer } = req.body as { answer?: string };
      if (!answer || !answer.trim()) {
        return res.status(400).json({ error: "Answer is required" });
      }
      const updated = await storage.answerDoubt(req.params.id, answer.trim());
      res.json(updated);
    } catch (error) {
      console.error("Answer doubt error:", error);
      res.status(500).json({ error: "Failed to answer doubt" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Teacher Routes
  app.get("/api/teachers", async (_req, res) => {
    try {
      const teachersList = await storage.getTeachers();
      res.json(teachersList);
    } catch (error) {
      console.error("Get teachers error:", error);
      res.status(500).json({ error: "Failed to get teachers" });
    }
  });

  app.get("/api/teachers/feedback", async (_req, res) => {
    try {
      const teachersList = await storage.getTeachers();
      res.json(teachersList);
    } catch (error) {
      console.error("Get teachers (feedback view) error:", error);
      res.status(500).json({ error: "Failed to get teachers for feedback view" });
    }
  });

  app.get("/api/teachers/:id", async (req, res) => {
    try {
      const teacher = await storage.getTeacher(req.params.id);
      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }
      res.json(teacher);
    } catch (error) {
      console.error("Get teacher error:", error);
      res.status(500).json({ error: "Failed to get teacher" });
    }
  });

  app.post("/api/teachers", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const data = insertTeacherSchema.parse(req.body);
      const teacher = await storage.createTeacher(data);
      res.status(201).json(teacher);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Create teacher error:", error);
      res.status(500).json({ error: "Failed to create teacher" });
    }
  });

  app.put("/api/teachers/:id/profile", authenticateToken, requireRole("teacher", "admin"), async (req: AuthRequest, res) => {
    try {
      const teacher = await storage.getTeacher(req.params.id);
      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }
      
      // Teachers can only update their own profile unless admin
      if (req.user!.role === "teacher" && req.user!.id !== teacher.id) {
        // In production, you'd link teacher.id to user.id
        // For now, we'll allow teachers to update any profile (simplified)
      }
      
      const updates = updateTeacherSchema.parse(req.body);
      const updated = await storage.updateTeacher(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Update teacher profile error:", error);
      res.status(500).json({ error: "Failed to update teacher profile" });
    }
  });

  app.delete("/api/teachers/:id", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const teacher = await storage.getTeacher(req.params.id);
      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }
      await storage.deleteTeacher(req.params.id);
      res.json({ message: "Teacher deleted successfully" });
    } catch (error) {
      console.error("Delete teacher error:", error);
      res.status(500).json({ error: "Failed to delete teacher" });
    }
  });

  // Feedback Routes
  app.get("/api/feedback/teacher/:teacherId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const feedbackList = await storage.getFeedbackByTeacher(req.params.teacherId);
      res.json(feedbackList);
    } catch (error) {
      console.error("Get feedback error:", error);
      res.status(500).json({ error: "Failed to get feedback" });
    }
  });

  app.get("/api/feedback/my-submissions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const teacherIds = await storage.getStudentFeedbackTeachers(req.user!.id);
      res.json(teacherIds);
    } catch (error) {
      console.error("Get submissions error:", error);
      res.status(500).json({ error: "Failed to get submissions" });
    }
  });

  // All feedback submitted by current student (with teacher names)
  app.get("/api/feedback/my", authenticateToken, requireRole("student"), async (req: AuthRequest, res) => {
    try {
      const [feedbackList, teachersList] = await Promise.all([
        storage.getFeedbackByStudent(req.user!.id),
        storage.getTeachers(),
      ]);

      const teacherMap = new Map(teachersList.map((t) => [t.id, t]));

      const result = feedbackList.map((fb) => {
        const teacher = teacherMap.get(fb.teacherId);
        return {
          ...fb,
          teacherName: teacher?.name || "Unknown Teacher",
          department: teacher?.department || null,
          subject: teacher?.subject || null,
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Get my feedback error:", error);
      res.status(500).json({ error: "Failed to get your feedback" });
    }
  });

  // Feedback reminder status for current student
  app.get("/api/feedback/reminder-status", authenticateToken, requireRole("student"), async (req: AuthRequest, res) => {
    try {
      const feedbackList = await storage.getFeedbackByStudent(req.user!.id);

      if (feedbackList.length === 0) {
        return res.json({
          needsReminder: true,
          lastFeedbackDate: null,
          daysSinceLastFeedback: null,
        });
      }

      const last = feedbackList[0];
      const lastDate = new Date(last.createdAt!);
      const now = new Date();
      const diffMs = now.getTime() - lastDate.getTime();
      const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      const THRESHOLD_DAYS = 7;

      res.json({
        needsReminder: daysSince >= THRESHOLD_DAYS,
        lastFeedbackDate: lastDate.toISOString(),
        daysSinceLastFeedback: daysSince,
      });
    } catch (error) {
      console.error("Get feedback reminder status error:", error);
      res.status(500).json({ error: "Failed to get feedback reminder status" });
    }
  });

  app.get("/api/feedback/transcribe-enabled", (_req, res) => {
    const enabled = !!process.env.OPENAI_API_KEY;
    res.json({ enabled });
  });

  interface UploadedAudioFile {
    buffer: Buffer;
    mimetype?: string;
  }

  app.post(
    "/api/feedback/transcribe",
    authenticateToken,
    requireRole("student"),
    upload.single("audio"),
    async (req: AuthRequest, res) => {
      try {
        if (!process.env.OPENAI_API_KEY) {
          return res.status(500).json({ error: "Transcription service not configured" });
        }

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const file = (req as any).file as UploadedAudioFile | undefined;
        if (!file) {
          return res.status(400).json({ error: "Audio file is required" });
        }

        const audioBlob = new Blob([file.buffer as any], {
          type: file.mimetype || "audio/webm",
        });

        const response = await openai.audio.transcriptions.create({
          file: audioBlob as any,
          model: "gpt-4o-transcribe",
        });

        const transcript = (response as any).text || "";

        if (!transcript.trim()) {
          return res.status(500).json({ error: "Could not generate transcription" });
        }

        res.json({ transcript });
      } catch (error: any) {
        console.error("Transcription error:", error);
        res.status(500).json({
          error: error?.message || "Failed to transcribe audio. Please try again.",
        });
      }
    }
  );

  app.post("/api/feedback", authenticateToken, requireRole("student"), async (req: AuthRequest, res) => {
    try {
      // Normalize empty comment strings to undefined
      const body = {
        ...req.body,
        comment: req.body.comment && req.body.comment.trim() ? req.body.comment.trim() : undefined,
        doubt: req.body.doubt && req.body.doubt.trim() ? req.body.doubt.trim() : undefined,
      };
      
      console.log("Feedback submission request:", { body, user: req.user });
      const data = insertFeedbackSchema.parse(body);

      // Simple abuse-word filter on comment
      if (data.comment) {
        const lower = data.comment.toLowerCase();
        const hasAbuse = ABUSIVE_WORDS.some((w) => lower.includes(w));
        if (hasAbuse) {
          return res.status(400).json({ error: "Please remove inappropriate language from your feedback before submitting." });
        }
      }
      
      // Check for duplicate feedback
      const hasExisting = await storage.hasFeedback(data.teacherId, req.user!.id);
      if (hasExisting) {
        return res.status(400).json({ error: "You have already submitted feedback for this teacher" });
      }

      const teacher = await storage.getTeacher(data.teacherId);
      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const anonymous = !!body.anonymous;

      const feedbackData: Parameters<typeof storage.createFeedback>[0] = {
        teacherId: data.teacherId,
        rating: data.rating,
        comment: data.comment || undefined,
        studentId: req.user!.id,
        studentName: anonymous ? "Anonymous Student" : req.user!.name,
        subject: teacher.subject,
      };
      
      const newFeedback = await storage.createFeedback(feedbackData);

      if (body.doubt) {
        await storage.createDoubt({
          teacherId: data.teacherId,
          studentId: req.user!.id,
          studentName: anonymous ? "Anonymous Student" : req.user!.name,
          question: body.doubt,
          answer: null,
        });
      }

      res.status(201).json(newFeedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", JSON.stringify(error.errors, null, 2));
        console.error("Request body:", req.body);
        return res.status(400).json({ error: error.errors[0].message, details: error.errors });
      }
      console.error("Create feedback error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ error: "Failed to submit feedback", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Public QR feedback submission (no auth)
  app.post("/api/qr-feedback/:teacherId", async (req: Request, res: Response) => {
    try {
      const { teacherId } = req.params;
      const { rating, comment } = req.body as { rating?: number; comment?: string };

      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be a number between 1 and 5" });
      }

      const safeComment = typeof comment === "string" && comment.trim() ? comment.trim() : undefined;

      if (safeComment) {
        const lower = safeComment.toLowerCase();
        const hasAbuse = ABUSIVE_WORDS.some((w) => lower.includes(w));
        if (hasAbuse) {
          return res.status(400).json({ error: "Please remove inappropriate language from your feedback before submitting." });
        }
      }

      const teacher = await storage.getTeacher(teacherId);
      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      // Ensure there is a special "QR" user to associate anonymous QR feedback with
      const qrEmail = "qr-feedback@internal.local";
      let qrUser = await storage.getUserByEmail(qrEmail);
      if (!qrUser) {
        qrUser = await storage.createUser({
          name: "QR Feedback Student",
          email: qrEmail,
          password: "qr-feedback-temp-password",
          username: qrEmail.split("@")[0],
          role: "student",
          department: "QR",
        });
      }

      const feedbackData: Parameters<typeof storage.createFeedback>[0] = {
        teacherId,
        studentId: qrUser.id,
        studentName: "QR Student",
        rating,
        comment: safeComment,
        subject: teacher.subject,
      };

      const newFeedback = await storage.createFeedback(feedbackData);
      res.status(201).json(newFeedback);
    } catch (error) {
      console.error("QR feedback error:", error);
      res.status(500).json({ error: "Failed to submit QR feedback" });
    }
  });

  // Get all feedback (for teachers to view their own)
  app.get("/api/feedback/received", authenticateToken, requireRole("teacher"), async (req: AuthRequest, res) => {
    try {
      // For now, return all feedback - in production, you'd link teachers to their user accounts
      // This is a simplified version
      const teachersList = await storage.getTeachers();
      const allFeedback: any[] = [];
      
      for (const teacher of teachersList) {
        const teacherFeedback = await storage.getFeedbackByTeacher(teacher.id);
        allFeedback.push(...teacherFeedback.map(f => ({
          ...f,
          teacherName: teacher.name,
        })));
      }
      
      allFeedback.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      res.json(allFeedback);
    } catch (error) {
      console.error("Get received feedback error:", error);
      res.status(500).json({ error: "Failed to get feedback" });
    }
  });

  // Get feedback for a specific teacher (public route)
  app.get("/api/feedback/teacher/:teacherId", async (req, res) => {
    try {
      const { teacherId } = req.params;
      const feedback = await storage.getFeedbackByTeacher(teacherId);
      res.json(feedback);
    } catch (error) {
      console.error("Get teacher feedback error:", error);
      res.status(500).json({ error: "Failed to get teacher feedback" });
    }
  });

  // Reply Routes
  app.get("/api/feedback/:feedbackId/replies", async (req, res) => {
    try {
      const replies = await storage.getRepliesByFeedback(req.params.feedbackId);
      res.json(replies);
    } catch (error) {
      console.error("Get replies error:", error);
      res.status(500).json({ error: "Failed to get replies" });
    }
  });

  app.post("/api/feedback/:feedbackId/replies", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const data = insertReplySchema.parse({
        ...req.body,
        feedbackId: req.params.feedbackId,
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
      });
      
      const reply = await storage.createReply(data);
      res.status(201).json(reply);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Create reply error:", error);
      res.status(500).json({ error: "Failed to create reply" });
    }
  });

  app.delete("/api/replies/:replyId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      await storage.deleteReply(req.params.replyId, req.user!.id);
      res.json({ message: "Reply deleted successfully" });
    } catch (error) {
      console.error("Delete reply error:", error);
      res.status(500).json({ error: "Failed to delete reply" });
    }
  });

  // Analytics Routes
  app.get("/api/analytics/teacher/:teacherId/trends", async (req, res) => {
    try {
      const { teacherId } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const trends = await storage.getFeedbackTrends(teacherId, startDate, endDate);
      res.json(trends);
    } catch (error) {
      console.error("Get trends error:", error);
      res.status(500).json({ error: "Failed to get trends" });
    }
  });

  app.get("/api/analytics/departments/comparison", async (_req, res) => {
    try {
      const comparison = await storage.getDepartmentComparison();
      res.json(comparison);
    } catch (error) {
      console.error("Get department comparison error:", error);
      res.status(500).json({ error: "Failed to get department comparison" });
    }
  });

  // Leaderboard Routes
  app.get("/api/leaderboard/top-rated", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topTeachers = await storage.getTopRatedTeachers(limit);
      res.json(topTeachers);
    } catch (error) {
      console.error("Get top rated teachers error:", error);
      res.status(500).json({ error: "Failed to get top rated teachers" });
    }
  });

  app.get("/api/leaderboard/most-feedback", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topTeachers = await storage.getMostFeedbackTeachers(limit);
      res.json(topTeachers);
    } catch (error) {
      console.error("Get most feedback teachers error:", error);
      res.status(500).json({ error: "Failed to get most feedback teachers" });
    }
  });

  app.get("/api/leaderboard/most-improved", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topTeachers = await storage.getMostImprovedTeachers(limit);
      res.json(topTeachers);
    } catch (error) {
      console.error("Get most improved teachers error:", error);
      res.status(500).json({ error: "Failed to get most improved teachers" });
    }
  });

  // Admin: Doubt SLA monitoring - overdue doubts
  app.get("/api/admin/doubts/overdue", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const days = parseInt(req.query.days as string) || 5;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const overdue = await db
        .select({
          id: doubts.id,
          teacherId: doubts.teacherId,
          studentName: doubts.studentName,
          question: doubts.question,
          status: doubts.status,
          createdAt: doubts.createdAt,
          answeredAt: doubts.answeredAt,
          teacherName: teachers.name,
          department: teachers.department,
        })
        .from(doubts)
        .leftJoin(teachers, eq(doubts.teacherId, teachers.id))
        .where(and(eq(doubts.status, "open"), lte(doubts.createdAt, cutoff)))
        .orderBy(desc(doubts.createdAt));

      res.json(overdue);
    } catch (error) {
      console.error("Get overdue doubts error:", error);
      res.status(500).json({ error: "Failed to get overdue doubts" });
    }
  });

  // Admin: Feedback moderation queue (flagged for abusive language)
  app.get("/api/admin/feedback/flagged", authenticateToken, requireRole("admin"), async (_req: AuthRequest, res) => {
    try {
      const all = await db
        .select({
          id: feedback.id,
          teacherId: feedback.teacherId,
          studentId: feedback.studentId,
          studentName: feedback.studentName,
          rating: feedback.rating,
          comment: feedback.comment,
          subject: feedback.subject,
          createdAt: feedback.createdAt,
          teacherName: teachers.name,
          department: teachers.department,
        })
        .from(feedback)
        .leftJoin(teachers, eq(feedback.teacherId, teachers.id))
        .orderBy(desc(feedback.createdAt));

      const flagged = all.filter((fb) => {
        if (!fb.comment) return false;
        const lower = fb.comment.toLowerCase();
        return ABUSIVE_WORDS.some((w) => lower.includes(w));
      });

      res.json(flagged);
    } catch (error) {
      console.error("Get flagged feedback error:", error);
      res.status(500).json({ error: "Failed to get flagged feedback" });
    }
  });

  // Admin: delete feedback (for moderation)
  app.delete("/api/admin/feedback/:id", authenticateToken, requireRole("admin"), async (req: AuthRequest, res) => {
    try {
      const id = req.params.id;
      const existing = await db
        .select()
        .from(feedback)
        .where(eq(feedback.id, id))
        .limit(1);

      if (!existing[0]) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      const fb = existing[0];
      await db.delete(feedback).where(eq(feedback.id, id));

      // Recalculate teacher aggregates after deletion
      const remaining = await db
        .select()
        .from(feedback)
        .where(eq(feedback.teacherId, fb.teacherId));

      if (remaining.length > 0) {
        const avgRating =
          remaining.reduce((sum, f) => sum + f.rating, 0) / remaining.length;
        await db
          .update(teachers)
          .set({ averageRating: avgRating, totalFeedback: remaining.length })
          .where(eq(teachers.id, fb.teacherId));
      } else {
        await db
          .update(teachers)
          .set({ averageRating: 0, totalFeedback: 0 })
          .where(eq(teachers.id, fb.teacherId));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete feedback (admin) error:", error);
      res.status(500).json({ error: "Failed to delete feedback" });
    }
  });

  // Activity Feed Route
  app.get("/api/activity/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activity = await storage.getRecentActivity(limit);
      res.json(activity);
    } catch (error) {
      console.error("Get recent activity error:", error);
      res.status(500).json({ error: "Failed to get recent activity" });
    }
  });

  app.get("/api/analytics/teacher/:teacherId/monthly", async (req, res) => {
    try {
      const { teacherId } = req.params;
      const monthly = await storage.getMonthlyPerformance(teacherId);
      res.json(monthly);
    } catch (error) {
      console.error("Get monthly performance error:", error);
      res.status(500).json({ error: "Failed to get monthly performance" });
    }
  });

  // AI Routes
  
  // AI: Analyze feedback sentiment and quality
  app.post("/api/ai/analyze-feedback/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const feedbackId = req.params.id;
      const feedbackData = await db
        .select()
        .from(feedback)
        .where(eq(feedback.id, feedbackId))
        .limit(1);

      if (!feedbackData[0]) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      const fb = feedbackData[0];
      
      // Analyze sentiment
      const sentiment = await aiService.analyzeSentiment(fb.comment || "");
      
      // Score quality
      const quality = await aiService.scoreFeedbackQuality(fb.comment || "", fb.rating);

      // Save analysis
      await storage.saveFeedbackAnalysis({
        feedbackId: fb.id,
        sentiment: sentiment.sentiment,
        sentimentScore: sentiment.score,
        qualityScore: quality.score,
        keywords: JSON.stringify(sentiment.keywords),
      });

      res.json({
        sentiment: sentiment.sentiment,
        sentimentScore: sentiment.score,
        keywords: sentiment.keywords,
        qualityScore: quality.score,
        qualityReasoning: quality.reasoning,
      });
    } catch (error: any) {
      console.error("Analyze feedback error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze feedback" });
    }
  });

  // AI: Generate teacher summary
  app.post("/api/ai/teacher-summary/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const teacherId = req.params.id;
      const feedbackList = await storage.getFeedbackByTeacher(teacherId);

      const summary = await aiService.generateFeedbackSummary(feedbackList);

      // Save summary
      await storage.saveTeacherSummary({
        teacherId,
        summary: summary.summary,
        strengths: JSON.stringify(summary.strengths),
        improvements: JSON.stringify(summary.improvements),
      });

      res.json(summary);
    } catch (error: any) {
      console.error("Generate summary error:", error);
      res.status(500).json({ error: error.message || "Failed to generate summary" });
    }
  });

  // AI: Get teacher summary
  app.get("/api/ai/teacher-summary/:id", async (req, res) => {
    try {
      const teacherId = req.params.id;
      const summary = await storage.getLatestTeacherSummary(teacherId);

      if (!summary) {
        return res.status(404).json({ error: "No summary available" });
      }

      res.json({
        summary: summary.summary,
        strengths: JSON.parse(summary.strengths || "[]"),
        improvements: JSON.parse(summary.improvements || "[]"),
        generatedAt: summary.generatedAt,
      });
    } catch (error: any) {
      console.error("Get summary error:", error);
      res.status(500).json({ error: error.message || "Failed to get summary" });
    }
  });

  // AI: Teacher recommendations
  app.post("/api/ai/recommend-teachers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { preferences } = req.body;
      
      if (!preferences || typeof preferences !== "string") {
        return res.status(400).json({ error: "Preferences string required" });
      }

      const teachers = await storage.getTeachers();
      const recommendations = await aiService.recommendTeachers(preferences, teachers);

      res.json({ recommendations });
    } catch (error: any) {
      console.error("Recommend teachers error:", error);
      res.status(500).json({ error: error.message || "Failed to get recommendations" });
    }
  });

  // AI: Improve student feedback text
  app.post("/api/ai/improve-feedback", authenticateToken, requireRole("student"), async (req: AuthRequest, res) => {
    try {
      const { comment } = req.body as { comment?: string };

      if (!comment || typeof comment !== "string" || !comment.trim()) {
        return res.status(400).json({ error: "Comment is required" });
      }

      const improvedComment = await aiService.improveFeedback(comment);
      res.json({ improvedComment });
    } catch (error: any) {
      console.error("Improve feedback error:", error);
      res.status(500).json({ error: error.message || "Failed to improve feedback" });
    }
  });

  // AI: Chatbot
  app.post("/api/ai/chat", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message required" });
      }

      const userId = req.user!.id;

      // Get recent chat history
      const history = await storage.getChatHistory(userId, 5);
      const conversationHistory = history.reverse().flatMap((h) => [
        { role: "user", content: h.message },
        { role: "assistant", content: h.response },
      ]);

      const response = await aiService.chatbot(message, conversationHistory);

      // Save to history
      await storage.saveChatMessage({
        userId,
        message,
        response,
      });

      res.json({ response });
    } catch (error: any) {
      console.error("Chatbot error:", error);
      res.status(500).json({ error: error.message || "Failed to process chat message" });
    }
  });

  // AI: Reply templates for teachers
  app.post("/api/ai/reply-templates", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { comment } = req.body as { comment?: string };

      if (!comment || typeof comment !== "string" || !comment.trim()) {
        return res.status(400).json({ error: "Comment is required" });
      }

      // Optional: restrict to teacher/admin roles
      if (req.user && !["teacher", "admin"].includes(req.user.role)) {
        return res.status(403).json({ error: "Only teachers and admins can use reply templates" });
      }

      const templates = await aiService.generateReplyTemplates(comment);
      res.json({ templates });
    } catch (error: any) {
      console.error("Reply templates error:", error);
      res.status(500).json({ error: error.message || "Failed to generate reply templates" });
    }
  });

  // AI: Get feedback analysis
  app.get("/api/ai/feedback-analysis/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const feedbackId = req.params.id;
      const analysis = await storage.getFeedbackAnalysis(feedbackId);

      if (!analysis) {
        return res.status(404).json({ error: "No analysis available" });
      }

      res.json({
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        qualityScore: analysis.qualityScore,
        keywords: JSON.parse(analysis.keywords || "[]"),
        analyzedAt: analysis.analyzedAt,
      });
    } catch (error: any) {
      console.error("Get feedback analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to get analysis" });
    }
  });

  return httpServer;
}
