import { type Express } from "express";
import { type Server } from "http";
import { storage } from "../storage";
import authRouter from "./auth";
import teachersRouter from "./teachers";
import doubtsRouter from "./doubts";
import quizzesRouter from "./quizzes";
import attendanceRouter from "./attendance";
import studyGroupsRouter from "./study-groups";
import analyticsRouter from "./analytics";
import feedbackRouter from "./feedback";
import academicServicesRouter from "./academic-services";
import announcementsRouter from "./announcements";
import achievementsRouter from "./achievements";
import assignmentsRouter from "./assignments";

import mongoose from "mongoose";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Global Health Check - non-blocking direct readyState check
  app.get("/api/health", (_req, res) => {
    const readyState = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const isConnected = readyState === 1;
    const isConnecting = readyState === 2;

    res.status(isConnected ? 200 : isConnecting ? 200 : 503).json({
      status: isConnected ? "ok" : isConnecting ? "connecting" : "error",
      timestamp: new Date().toISOString(),
      mongodb: isConnected ? "connected" : isConnecting ? "connecting" : "disconnected",
      uptime: process.uptime(),
    });
  });

  // Mount all modular domain routers
  app.use("/api", authRouter);
  app.use("/api", teachersRouter);
  app.use("/api", doubtsRouter);
  app.use("/api", quizzesRouter);
  app.use("/api", attendanceRouter);
  app.use("/api", studyGroupsRouter);
  app.use("/api", analyticsRouter);
  app.use("/api", feedbackRouter);
  app.use("/api", academicServicesRouter);
  app.use("/api", announcementsRouter);
  app.use("/api", achievementsRouter);
  app.use("/api", assignmentsRouter);

  return httpServer;
}
export type { AuthRequest } from "./common";
