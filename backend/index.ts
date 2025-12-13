// Load environment variables FIRST
import dotenv from "dotenv";
import path from "path";

dotenv.config();
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
}

console.log("Loaded DATABASE_URL =", process.env.DATABASE_URL ? "set" : "missing");

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import fs from "fs";

const app = express();
const httpServer = createServer(app);

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: corsOrigin ? corsOrigin.split(",").map((s) => s.trim()).filter(Boolean) : true,
    credentials: true,
  }),
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV !== "production") {
  app.get("/", (_req, res) => {
    res.status(200).send("Backend is running. Frontend is served separately.");
  });
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Seed database only when explicitly enabled (avoid slowing down cold starts)
    const shouldSeed =
      process.env.NODE_ENV !== "production" ||
      process.env.SEED_ON_STARTUP === "true";
    if (shouldSeed) {
      try {
        const { seed } = await import("./seed");
        await seed();
      } catch (seedError) {
        console.warn("Database seeding failed or skipped:", seedError);
      }
    }

    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
    });

    // Serve built frontend from the same server in production
    if (process.env.NODE_ENV === "production") {
      const publicDir = path.resolve(process.cwd(), "dist", "public");
      if (fs.existsSync(publicDir)) {
        app.use(
          express.static(publicDir, {
            immutable: true,
            maxAge: "1y",
            index: false,
          }),
        );
        app.get("*", (_req, res) => {
          // HTML should not be cached aggressively so new deploys show up immediately
          res.setHeader("Cache-Control", "no-cache");
          res.sendFile(path.join(publicDir, "index.html"));
        });
      } else {
        log(`Frontend build not found at ${publicDir}`, "express");
      }
    }

    // Use the PORT from environment or default to 5001
    const port = parseInt(process.env.BACKEND_PORT || process.env.PORT || "5001", 10);
    httpServer.listen(port, "0.0.0.0", () => {
      const url = `http://localhost:${port}`;
      log(`serving on port ${port}`);
      console.log("");
      console.log("╔══════════════════════════════════════╗");
      console.log("║   🎓 EduFeedback is running!        ║");
      console.log(`║   Open: ${url.padEnd(25)} ║`);
      console.log("╚══════════════════════════════════════╝");
      console.log("");
      console.log(`🌐 Server URL: ${url}`);
      console.log(`📝 Open this link in your browser: ${url}`);
      console.log("");
    });
  } catch (error) {
    console.error("Fatal server error:", error);
    process.exit(1);
  }
})();
