// Saved jobs: the jobs a student has bookmarked to come back to.
// Only the job ids are kept, in a small JSON file on the server, so the job
// details always come from jobs.json and can never go stale.
import { readFile, writeFile } from "node:fs/promises";
import { findJob } from "./jobs.js";

const DEFAULT_PATH = new URL("../saved.json", import.meta.url);

/** The saved job ids, in the order they were saved. A missing or unreadable file means nothing is saved yet. */
export async function loadSavedIds(path = DEFAULT_PATH) {
  try {
    const ids = JSON.parse(await readFile(path, "utf8"));
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

async function storeSavedIds(ids, path) {
  await writeFile(path, JSON.stringify(ids, null, 2) + "\n");
}

/** Saves a job id. Saving the same job twice keeps one copy. Returns the saved ids. */
export async function addSaved(id, path = DEFAULT_PATH) {
  const ids = await loadSavedIds(path);
  if (!ids.includes(id)) {
    ids.push(id);
    await storeSavedIds(ids, path);
  }
  return ids;
}

/** Removes a job id. Returns true if it was saved, false if it was not there. */
export async function removeSaved(id, path = DEFAULT_PATH) {
  const ids = await loadSavedIds(path);
  const next = ids.filter((savedId) => savedId !== id);
  if (next.length === ids.length) return false;
  await storeSavedIds(next, path);
  return true;
}

/** The saved jobs themselves, in saved order. Ids with no matching job are skipped. */
export function savedJobs(jobs, ids) {
  return ids.map((id) => findJob(jobs, id)).filter((job) => job !== null);
}
