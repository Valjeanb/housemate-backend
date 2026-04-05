import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authMiddleware } from "./middleware/auth";
import { tasksRouter } from "./routes/tasks";
import { completionsRouter } from "./routes/completions";
import { categoriesRouter } from "./routes/categories";
import { syncRouter } from "./routes/sync";
import { aiRouter } from "./routes/ai";

const app = new Hono();

// CORS — allow all origins for now (mobile apps don't enforce CORS,
// but useful for web testing). Tighten for production.
app.use("*", cors({ origin: "*", credentials: true }));

// Logging
app.use("*", logger());

// Auth middleware on all /api routes
app.use("/api/*", authMiddleware());

// Health check
app.get("/health", (c) => c.json({ status: "ok", app: "housemate" }));

// API Routes
app.route("/api/tasks", tasksRouter);
app.route("/api/completions", completionsRouter);
app.route("/api/categories", categoriesRouter);
app.route("/api/sync", syncRouter);
app.route("/api/ai", aiRouter);

const port = Number(process.env.PORT) || 3000;

console.log(`Housemate API running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
