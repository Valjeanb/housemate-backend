<stack>
  Bun runtime, Hono web framework, Zod validation.
</stack>

<structure>
  src/index.ts     — App entry, middleware, route mounting
  src/routes/      — Route modules (create as needed)
</structure>

<routes>
  Create routes in src/routes/ and mount them in src/index.ts.

  Example route file (src/routes/todos.ts):
  ```typescript
  import { Hono } from "hono";
  import { zValidator } from "@hono/zod-validator";
  import { z } from "zod";

  const todosRouter = new Hono();

  todosRouter.get("/", (c) => {
    return c.json({ todos: [] });
  });

  todosRouter.post(
    "/",
    zValidator("json", z.object({ title: z.string() })),
    (c) => {
      const { title } = c.req.valid("json");
      return c.json({ todo: { id: "1", title } });
    }
  );

  export { todosRouter };
  ```

  Mount in src/index.ts:
  ```typescript
  import { todosRouter } from "./routes/todos";
  app.route("/api/todos", todosRouter);
  ```

  IMPORTANT: Make sure all endpoints and routes are prefixed with `/api/`
</routes>

<database>
  No database is configured by default.
  If the user needs to persist data or have user accounts, use the database-auth skill and then update this file to reflect the changes.
</database>

<package_management>
  Runtime: bun (not npm). After `bun add <pkg>`, both `package.json` AND `bun.lock` need to be saved — the VibeCode-era rule about committing immediately no longer applies (you're in Claude Code now), but if the user uses git, that's still good practice.

  CRITICAL: This backend lives inside OneDrive. **Never run `bun install` directly in this folder.** Junction `node_modules` to `C:\dev_modules\sitterhub_backend\` first:

  ```powershell
  cmd /c mklink /J node_modules C:\dev_modules\sitterhub_backend
  bun install
  ```

  See root `Claude Code\CLAUDE.md` for the full node_modules-in-OneDrive policy.
</package_management>