import { Hono } from "hono";
import { supabase } from "../lib/supabase";
import { taskToMobile, completionLogToMobile } from "../lib/types";

const syncRouter = new Hono();

// GET /api/sync — Full state snapshot
syncRouter.get("/", async (c) => {
  const [tasksRes, categoriesRes, configRes, logsRes] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("app_config").select("*"),
    supabase.from("completion_logs").select("*").order("completed_at", { ascending: false }).limit(200),
  ]);

  if (tasksRes.error) return c.json({ error: tasksRes.error.message }, 500);

  // Get today's and recent daily completions (last 7 days)
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const { data: dailyCompletions, error: dcError } = await supabase
    .from("daily_completions")
    .select("*")
    .gte("date", weekAgoStr);

  if (dcError) return c.json({ error: dcError.message }, 500);

  // Build dailyCompletions map: { "YYYY-MM-DD": ["taskId1", "taskId2"] }
  const dailyCompletionsMap: Record<string, string[]> = {};
  for (const dc of dailyCompletions || []) {
    if (!dailyCompletionsMap[dc.date]) {
      dailyCompletionsMap[dc.date] = [];
    }
    dailyCompletionsMap[dc.date].push(dc.task_id);
  }

  // Get config values
  const config: Record<string, string> = {};
  for (const row of configRes.data || []) {
    config[row.key] = row.value;
  }

  return c.json({
    tasks: (tasksRes.data || []).map(taskToMobile),
    categories: categoriesRes.data || [],
    dailyCompletions: dailyCompletionsMap,
    completionLogs: (logsRes.data || []).map(completionLogToMobile),
    currentSeason: config.current_season || "summer",
    lastModified: config.last_modified || new Date().toISOString(),
    serverTime: new Date().toISOString(),
  });
});

// GET /api/sync/since?ts=ISO — Changes since timestamp
syncRouter.get("/since", async (c) => {
  const ts = c.req.query("ts");
  if (!ts) return c.json({ error: "ts query param required" }, 400);

  // Check if anything has changed
  const { data: configData } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "last_modified")
    .single();

  const lastModified = configData?.value || new Date().toISOString();

  // If nothing changed since the timestamp, return empty
  if (new Date(lastModified) <= new Date(ts)) {
    return c.json({ changed: false, lastModified });
  }

  // Something changed — fetch updated data
  const [tasksRes, categoriesRes, configRes] = await Promise.all([
    supabase.from("tasks").select("*").gte("updated_at", ts),
    supabase.from("categories").select("*"),
    supabase.from("app_config").select("*"),
  ]);

  // Get recent completions
  const today = new Date().toISOString().split("T")[0];
  const { data: todayCompletions } = await supabase
    .from("daily_completions")
    .select("*")
    .eq("date", today);

  // Get recent logs
  const { data: recentLogs } = await supabase
    .from("completion_logs")
    .select("*")
    .gte("completed_at", ts)
    .order("completed_at", { ascending: false });

  const config: Record<string, string> = {};
  for (const row of configRes.data || []) {
    config[row.key] = row.value;
  }

  // Build today's completions
  const todayCompletionIds = (todayCompletions || []).map((dc: any) => dc.task_id);

  return c.json({
    changed: true,
    updatedTasks: (tasksRes.data || []).map(taskToMobile),
    categories: categoriesRes.data || [],
    todayCompletions: todayCompletionIds,
    todayDate: today,
    newLogs: (recentLogs || []).map(completionLogToMobile),
    currentSeason: config.current_season || "summer",
    lastModified,
    serverTime: new Date().toISOString(),
  });
});

// PUT /api/sync/config — Update config (owner only)
syncRouter.put("/config", async (c) => {
  const body = await c.req.json();
  const now = new Date().toISOString();

  if (body.currentSeason) {
    await supabase.from("app_config").upsert({ key: "current_season", value: body.currentSeason, updated_at: now });
  }

  await supabase.from("app_config").upsert({ key: "last_modified", value: now, updated_at: now });

  return c.json({ success: true });
});

export { syncRouter };
