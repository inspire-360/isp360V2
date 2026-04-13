import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const rootDir = resolve(process.cwd(), "dist");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || process.argv[2] || 4175);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const sendFile = async (response, filePath) => {
  const fileStats = await stat(filePath);
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": fileStats.size,
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${host}:${port}`);
    const normalizedPath = normalize(decodeURIComponent(requestUrl.pathname)).replace(/^([.][.][/\\])+/, "");
    const requestedFile = resolve(join(rootDir, normalizedPath.slice(1)));
    const insideRoot = requestedFile === rootDir || requestedFile.startsWith(`${rootDir}\\`) || requestedFile.startsWith(`${rootDir}/`);

    if (!insideRoot) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    if (existsSync(requestedFile)) {
      const requestedStats = await stat(requestedFile);
      if (requestedStats.isFile()) {
        await sendFile(response, requestedFile);
        return;
      }
    }

    await sendFile(response, join(rootDir, "index.html"));
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`SPA preview server running at http://${host}:${port}`);
});
