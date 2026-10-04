import http from "node:http";
import path from "node:path";
import handler from "serve-handler";

/** Serve the static export in out/ on a random port. */
export async function serveOut(dir = path.resolve("out")): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => handler(req, res, { public: dir, trailingSlash: true }));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(() => r())) };
}

export const CHROMIUM = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
