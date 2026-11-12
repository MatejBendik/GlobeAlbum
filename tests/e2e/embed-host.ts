import { createServer } from "node:http";

if (process.env.GLOBEALBUM_EMBED_TEST_HOST !== "1") {
  throw new Error("This host is only for isolated embed browser tests.");
}

// A separate, cross-site portfolio origin. Never served by the application.
createServer((request, response) => {
  const url = new URL(request.url!, "http://localhost:8790");
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(
    `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Example portfolio</title></head><body style="margin:0;background:#fafaf8;color:#252924;font-family:system-ui"><main style="max-width:960px;margin:0 auto;padding:16px"><h1>Example portfolio</h1>${url.searchParams.get("embed") ?? ""}<p>More stories below the globe.</p></main></body></html>`,
  );
}).listen(8790, "127.0.0.1");
