import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addSaved, loadSavedIds, removeSaved, savedJobs } from "../lib/saved.js";
import { loadJobs } from "../lib/jobs.js";
import { createApp } from "../server.js";

async function tempSavedPath() {
  const dir = await mkdtemp(join(tmpdir(), "job-board-test-"));
  return join(dir, "saved.json");
}

test("the store starts empty when there is no file yet", async () => {
  const path = await tempSavedPath();
  assert.deepEqual(await loadSavedIds(path), []);
});

test("saving the same job twice keeps one copy, and it survives a reload", async () => {
  const path = await tempSavedPath();
  await addSaved("j1", path);
  await addSaved("j3", path);
  await addSaved("j1", path);
  assert.deepEqual(await loadSavedIds(path), ["j1", "j3"]);
});

test("removeSaved takes a job out and reports when it was never saved", async () => {
  const path = await tempSavedPath();
  await addSaved("j1", path);
  assert.equal(await removeSaved("j1", path), true);
  assert.equal(await removeSaved("j1", path), false);
  assert.deepEqual(await loadSavedIds(path), []);
});

test("savedJobs resolves ids to jobs in saved order and skips unknown ids", async () => {
  const jobs = await loadJobs();
  const saved = savedJobs(jobs, ["j3", "nope", "j1"]);
  assert.deepEqual(saved.map((j) => j.id), ["j3", "j1"]);
});

async function startTestServer() {
  const savedPath = await tempSavedPath();
  const server = createApp(savedPath);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, base: `http://localhost:${server.address().port}`, savedPath };
}

function postSaved(base, jobId) {
  return fetch(`${base}/api/saved`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId }),
  });
}

test("the API saves, lists and removes a job", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const created = await postSaved(base, "j2");
  assert.equal(created.status, 201);

  const again = await postSaved(base, "j2");
  assert.equal(again.status, 200);

  let saved = await (await fetch(`${base}/api/saved`)).json();
  assert.deepEqual(saved.map((j) => j.id), ["j2"]);
  assert.equal(saved[0].company, "Kite Learning");

  const removed = await fetch(`${base}/api/saved/j2`, { method: "DELETE" });
  assert.equal(removed.status, 200);
  saved = await (await fetch(`${base}/api/saved`)).json();
  assert.deepEqual(saved, []);
});

test("an unknown job id gets a clear error, not a crash", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const res = await postSaved(base, "nope");
  assert.equal(res.status, 404);
  assert.match((await res.json()).error, /Unknown job id/);

  const jobs = await fetch(`${base}/api/jobs`);
  assert.equal(jobs.status, 200);

  const removeMissing = await fetch(`${base}/api/saved/j5`, { method: "DELETE" });
  assert.equal(removeMissing.status, 404);
});

test("saved jobs are still there after the server restarts", async (t) => {
  const first = await startTestServer();
  await postSaved(first.base, "j6");
  first.server.close();

  const second = createApp(first.savedPath);
  await new Promise((resolve) => second.listen(0, resolve));
  t.after(() => second.close());
  const saved = await (await fetch(`http://localhost:${second.address().port}/api/saved`)).json();
  assert.deepEqual(saved.map((j) => j.id), ["j6"]);
});
