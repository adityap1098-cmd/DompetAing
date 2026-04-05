/**
 * Test helper — creates a Hono test client with mocked auth.
 */
import { Hono } from "hono";

/**
 * Build a test app wrapping a route module.
 * Auth middleware is already mocked via setup.ts.
 */
export function createTestApp(routeModule: Hono, basePath: string = "/") {
  const app = new Hono();
  app.route(basePath, routeModule);
  return app;
}

/**
 * Helper for making requests to a Hono app in tests.
 */
export async function testRequest(
  app: Hono,
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  const reqInit: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      "Content-Type": "application/json",
      Cookie: "dompetaing_session=mock",
      ...headers,
    },
  };
  if (body) {
    reqInit.body = JSON.stringify(body);
  }
  const url = `http://localhost${path}`;
  const res = await app.request(url, reqInit);
  const json = await res.json().catch(() => null);
  return { status: res.status, json, headers: res.headers };
}
