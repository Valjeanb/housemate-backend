import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { supabase } from "../lib/supabase";
import { taskFromMobile, taskToMobile } from "../lib/types";
import { ownerOnly } from "../middleware/auth";

const tasksRouter = new Hono();

// GET /api/tasks — List all tasks
tasksRouter.get("/", async (c) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data.map(taskToMobile));
});

// POST /api/tasks — Create a task (owner only)
const createTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  category: z.string().default("property"),
  frequency: z.enum(["daily", "weekly", "seasonal", "as-needed", "custom"]).default("daily"),
  customIntervalDays: z.number().optional(),
  timeOfDay: z.enum(["morning", "anytime", "evening"]).default("anytime"),
  estimatedMinutes: z.number().default(10),
  overview: z.string().optional(),
  steps: z.array(z.string()).optional(),
  description: z.string().default(""),
  mediaAttachments: z.array(z.string()).optional(),
  priority: z.enum(["critical", "important", "routine"]).default("routine"),
  requiresMedication: z.boolean().default(false),
  medicationText: z.string().optional(),
  requiresPhoto: z.boolean().default(false),
  isActive: z.boolean().default(true),
  doneProperlyText: z.string().optional(),
  redFlagsText: z.string().optional(),
  seasonProfiles: z.array(z.string()).optional(),
  howToGuideIds: z.array(z.string()).optional(),
});

tasksRouter.post("/", ownerOnly(), zValidator("json", createTaskSchema), async (c) => {
  const body = c.req.valid("json");
  const id = body.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const dbTask = taskFromMobile({ ...body, id });

  const { data, error } = await supabase.from("tasks").insert(dbTask).select().single();
  if (error) return c.json({ error: error.message }, 500);

  // Update last_modified
  await supabase.from("app_config").upsert({ key: "last_modified", value: new Date().toISOString(), updated_at: new Date().toISOString() });

  return c.json(taskToMobile(data), 201);
});

// PUT /api/tasks/:id — Update a task (owner only)
tasksRouter.put("/:id", ownerOnly(), zValidator("json", createTaskSchema.partial()), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const dbTask = taskFromMobile(body);

  const { data, error } = await supabase.from("tasks").update(dbTask).eq("id", id).select().single();
  if (error) return c.json({ error: error.message }, 500);

  await supabase.from("app_config").upsert({ key: "last_modified", value: new Date().toISOString(), updated_at: new Date().toISOString() });

  return c.json(taskToMobile(data));
});

// DELETE /api/tasks/:id — Delete a task (owner only)
tasksRouter.delete("/:id", ownerOnly(), async (c) => {
  const id = c.req.param("id");
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return c.json({ error: error.message }, 500);

  await supabase.from("app_config").upsert({ key: "last_modified", value: new Date().toISOString(), updated_at: new Date().toISOString() });

  return c.json({ success: true });
});

export { tasksRouter };
