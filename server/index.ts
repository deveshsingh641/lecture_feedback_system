// Load environment variables FIRST
import dotenv from "dotenv";
dotenv.config();

// Debug print
console.log("Loaded DATABASE_URL =", process.env.DATABASE_URL);

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";

const app = express();
const httpServer = createServer(app);

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
    // Seed database on startup
    try {
      const { seed } = await import("./seed");
      await seed();
    } catch (seedError) {
      console.warn("Database seeding failed or skipped:", seedError);
    }

    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
    });

    // Serve Vite or static depending on environment
    if (process.env.NODE_ENV === "production") {
      log("Using static file serving (production mode)");
      const publicDir = path.resolve(process.cwd(), "dist", "public");
      app.use(express.static(publicDir));
      app.use("*", (req, res) => {
        res.sendFile(path.join(publicDir, "index.html"));
      });
    } else {
      try {
        const { setupVite } = await import("./vite");
        await setupVite(httpServer, app);
      } catch (viteError) {
        log("Vite setup failed, falling back to static serving");
        console.error("Vite error:", viteError);
        const publicDir = path.resolve(process.cwd(), "dist", "public");
        app.use(express.static(publicDir));
        app.use("*", (req, res) => {
          res.sendFile(path.join(publicDir, "index.html"));
        });
      }
    }

    // Use the PORT from environment or default to 5000
    const port = parseInt(process.env.PORT || "5000", 10);
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
