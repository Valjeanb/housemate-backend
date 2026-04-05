import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import Anthropic from "@anthropic-ai/sdk";
import { ownerOnly } from "../middleware/auth";

const aiRouter = new Hono();

const generateTaskSchema = z.object({
  description: z.string().min(3),
  categories: z.array(z.object({
    id: z.string(),
    label: z.string(),
  })),
});

aiRouter.post("/generate-task", ownerOnly(), zValidator("json", generateTaskSchema), async (c) => {
  const { description, categories } = c.req.valid("json");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  const anthropic = new Anthropic({ apiKey });

  const categoryList = categories.map((cat) => `"${cat.id}" (${cat.label})`).join(", ");

  const systemPrompt = `You are a task generator for Housemate, a house-sitting app for a rural property called Roxley in Wangaratta, Victoria, Australia. House sitters stay rent-free and contribute ~1 hour/day to property care.

Given a natural language description, generate a complete task object as JSON. Be practical, specific, and err on the side of safety — especially for animal care tasks.

Available categories: ${categoryList}

The JSON must have exactly these fields:
{
  "title": "Short task title (don't include time of day)",
  "category": "one of the category IDs listed above",
  "frequency": "daily" | "weekly" | "seasonal" | "as-needed" | "custom",
  "customIntervalDays": number or null (only if frequency is "custom"),
  "timeOfDay": "morning" | "anytime" | "evening",
  "estimatedMinutes": number (realistic estimate),
  "overview": "1-2 sentence summary of the task",
  "steps": ["Step 1 text", "Step 2 text", ...] (3-7 clear, specific steps),
  "priority": "critical" | "important" | "routine",
  "requiresMedication": boolean,
  "medicationText": "medication details" or null,
  "requiresPhoto": boolean,
  "doneProperlyText": "What the completed task looks like",
  "redFlagsText": "Warning signs to watch for",
  "seasonProfiles": [] or ["summer"] or ["winter"] (which seasons this applies to, empty = all year)
}

Example for "Feed Scout his morning food with arthritis tablet":
{
  "title": "Feed Scout — Morning",
  "category": "dog",
  "frequency": "daily",
  "customIntervalDays": null,
  "timeOfDay": "morning",
  "estimatedMinutes": 10,
  "overview": "Scout's morning feed with medications. Scout is a senior dog who needs his food prepared a specific way.",
  "steps": ["Get Scout's bowl from the kitchen bench", "Add 1 cup of dry food from the container in the laundry", "Add warm water and mix until slightly softened", "Mix in arthritis tablet (from container marked SCOUT AM)", "Place bowl in his usual spot by the back door", "Fresh water in his water bowl", "Let him out for a toilet break after eating"],
  "priority": "critical",
  "requiresMedication": true,
  "medicationText": "Arthritis tablet (AM container) mixed into softened food",
  "requiresPhoto": false,
  "doneProperlyText": "Bowl is empty, Scout has eaten everything, water bowl is full, Scout has been outside for a toilet break",
  "redFlagsText": "Scout not eating, limping more than usual, vomiting, unusual lethargy",
  "seasonProfiles": []
}

Respond with ONLY the JSON object, no markdown formatting or extra text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Generate a task for: "${description}"`,
        },
      ],
      system: systemPrompt,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the JSON response
    const taskData = JSON.parse(text);

    // Generate an ID
    taskData.id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    taskData.isActive = true;
    taskData.description = taskData.overview + "\n\n**Steps:**\n" +
      (taskData.steps || []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n");

    return c.json(taskData);
  } catch (err: any) {
    console.error("AI generation error:", err);
    return c.json({ error: err.message || "AI generation failed" }, 500);
  }
});

export { aiRouter };
