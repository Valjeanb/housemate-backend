import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { supabase } from "../lib/supabase";
import { completionLogToMobile } from "../lib/types";

const completionsRouter = new Hono();

// GET /api/completions?date=YYYY-MM-DD — Get completions for a date
completionsRouter.get("/", async (c) => {
  const date = c.req.query("date");

  let query = supabase.from("daily_completions").select("*");
  if (date) {
    query = query.eq("date", date);
  }

  const { data, error } = await query.order("completed_at", { ascending: true });
  if (error) return c.json({ error: error.message }, 500);

  return c.json(data);
});

// POST /api/completions — Mark task complete
const completeSchema = z.object({
  taskId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  flaggedNeedsAttention: z.boolean().default(false),
});

completionsRouter.post("/", zValidator("json", completeSchema), async (c) => {
  const body = c.req.valid("json");
  const userName = c.get("userName") || "sitter";
  const now = new Date().toISOString();

  // Insert daily completion
  const { error: dcError } = await supabase.from("daily_completions").insert({
    date: body.date,
    task_id: body.taskId,
    completed_by: userName,
    completed_at: now,
  });
  if (dcError) return c.json({ error: dcError.message }, 500);

  // Insert completion log
  const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { error: logError } = await supabase.from("completion_logs").insert({
    id: logId,
    task_id: body.taskId,
    completed_at: now,
    completed_by: userName,
    notes: body.notes || null,
    photo_urls: body.photoUrls || [],
    flagged_needs_attention: body.flaggedNeedsAttention,
  });
  if (logError) return c.json({ error: logError.message }, 500);

  // Update last_modified
  await supabase.from("app_config").upsert({ key: "last_modified", value: now, updated_at: now });

  return c.json({ success: true, logId }, 201);
});

// DELETE /api/completions/:taskId?date=YYYY-MM-DD — Uncomplete a task
completionsRouter.delete("/:taskId", async (c) => {
  const taskId = c.req.param("taskId");
  const date = c.req.query("date");

  if (!date) return c.json({ error: "date query param required" }, 400);

  const { error } = await supabase
    .from("daily_completions")
    .delete()
    .eq("task_id", taskId)
    .eq("date", date);

  if (error) return c.json({ error: error.message }, 500);

  await supabase.from("app_config").upsert({ key: "last_modified", value: new Date().toISOString(), updated_at: new Date().toISOString() });

  return c.json({ success: true });
});

// GET /api/completions/logs — All completion logs
completionsRouter.get("/logs", async (c) => {
  const taskId = c.req.query("taskId");

  let query = supabase.from("completion_logs").select("*").order("completed_at", { ascending: false }).limit(100);
  if (taskId) {
    query = query.eq("task_id", taskId);
  }

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  return c.json(data.map(completionLogToMobile));
});

export { completionsRouter };
