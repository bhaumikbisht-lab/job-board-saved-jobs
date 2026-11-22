// A small job board: a JSON API and one page. Run with `npm start`.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { findJob, loadJobs, searchJobs } from "./lib/jobs.js";
import { addSaved, loadSavedIds, removeSaved, savedJobs } from "./lib/saved.js";

const PORT = Number(process.env.PORT ?? 3000);

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createApp(savedPath) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET" && url.pathname === "/api/jobs") {
        const jobs = await loadJobs();
        return sendJson(res, 200, searchJobs(jobs, url.searchParams.get("q")));
      }
      if (req.method === "GET" && url.pathname === "/api/saved") {
        const jobs = await loadJobs();
        const ids = await loadSavedIds(savedPath);
        return sendJson(res, 200, savedJobs(jobs, ids));
      }
      if (req.method === "POST" && url.pathname === "/api/saved") {
        let body;
        try {
          body = await readJsonBody(req);
        } catch {
          return sendJson(res, 400, { error: "Request body must be JSON, like { \"jobId\": \"j1\" }" });
        }
        const jobs = await loadJobs();
        const job = typeof body?.jobId === "string" ? findJob(jobs, body.jobId) : null;
        if (!job) return sendJson(res, 404, { error: `Unknown job id: ${body?.jobId}` });
        const alreadySaved = (await loadSavedIds(savedPath)).includes(job.id);
        await addSaved(job.id, savedPath);
        return sendJson(res, alreadySaved ? 200 : 201, job);
      }
      if (req.method === "DELETE" && url.pathname.startsWith("/api/saved/")) {
        const jobId = decodeURIComponent(url.pathname.slice("/api/saved/".length));
        if (!(await removeSaved(jobId, savedPath))) {
          return sendJson(res, 404, { error: `Job is not saved: ${jobId}` });
        }
        return sendJson(res, 200, { removed: jobId });
      }
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/app.js")) {
        const file = url.pathname === "/" ? "index.html" : "app.js";
        const type = file.endsWith(".html") ? "text/html" : "text/javascript";
        const body = await readFile(new URL(`./public/${file}`, import.meta.url));
        res.writeHead(200, { "content-type": `${type}; charset=utf-8` });
        return res.end(body);
      }
      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: "Something went wrong" });
    }
  });
}

// Started directly (npm start), not imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(PORT, () => console.log(`Job board on http://localhost:${PORT}`));
}
