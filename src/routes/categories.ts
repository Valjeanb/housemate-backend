import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { supabase } from "../lib/supabase";
import { ownerOnly } from "../middleware/auth";

const categoriesRouter = new Hono();

// GET /api/categories
categoriesRouter.get("/", async (c) => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// POST /api/categories (owner only)
const categorySchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  color: z.string().default("#78716C"),
  icon: z.string().default("Folder"),
  sort_order: z.number().default(0),
});

categoriesRouter.post("/", ownerOnly(), zValidator("json", categorySchema), async (c) => {
  const body = c.req.valid("json");
  const { data, error } = await supabase.from("categories").insert(body).select().single();
  if (error) return c.json({ error: error.message }, 500);

  await supabase.from("app_config").upsert({ key: "last_modified", value: new Date().toISOString(), updated_at: new Date().toISOString() });
  return c.json(data, 201);
});

// PUT /api/categories/:id (owner only)
categoriesRouter.put("/:id", ownerOnly(), zValidator("json", categorySchema.partial()), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const { data, error } = await supabase.from("categories").update(body).eq("id", id).select().single();
  if (error) return c.json({ error: error.message }, 500);

  await supabase.from("app_config").upsert({ key: "last_modified", value: new Date().toISOString(), updated_at: new Date().toISOString() });
  return c.json(data);
});

// DELETE /api/categories/:id (owner only)
categoriesRouter.delete("/:id", ownerOnly(), async (c) => {
  const id = c.req.param("id");
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return c.json({ error: error.message }, 500);

  await supabase.from("app_config").upsert({ key: "last_modified", value: new Date().toISOString(), updated_at: new Date().toISOString() });
  return c.json({ success: true });
});

export { categoriesRouter };
