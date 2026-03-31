import type { Context } from "hono";
import { ZodError } from "zod";

export function errorHandler(err: Error, c: Context): Response {
  console.error("[Error]", err);

  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: "Validation error",
        details: err.errors,
        data: null,
      },
      400
    );
  }

  const message = process.env.NODE_ENV === "production"
    ? "Internal server error"
    : err.message;

  return c.json({ success: false, error: message, data: null }, 500);
}
