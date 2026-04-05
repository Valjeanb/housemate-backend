import { Context, Next } from "hono";

// Simple PIN + role-based auth middleware
// Headers: X-User-Role (owner|sitter), X-User-Name, X-Auth-Pin

export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const role = c.req.header("X-User-Role") || "sitter";
    const userName = c.req.header("X-User-Name") || "Unknown";
    const pin = c.req.header("X-Auth-Pin");

    const expectedPin = process.env.AUTH_PIN;
    if (expectedPin && pin !== expectedPin) {
      return c.json({ error: "Invalid PIN" }, 401);
    }

    c.set("userRole", role);
    c.set("userName", userName);
    await next();
  };
}

// Restrict route to owner only
export function ownerOnly() {
  return async (c: Context, next: Next) => {
    const role = c.get("userRole");
    if (role !== "owner") {
      return c.json({ error: "Owner access required" }, 403);
    }
    await next();
  };
}
