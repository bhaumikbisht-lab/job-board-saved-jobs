const list = document.getElementById("jobs");
const savedList = document.getElementById("saved");
const savedEmpty = document.getElementById("saved-empty");
const search = document.getElementById("search");
let savedIds = new Set();

function jobText(job) {
  return `${job.title} at ${job.company}, ${job.location}. Rs ${job.stipend.toLocaleString("en-IN")} a month.`;
}

async function showJobs(query = "") {
  const res = await fetch(`/api/jobs?q=${encodeURIComponent(query)}`);
  const jobs = await res.json();
  list.innerHTML = "";
  for (const job of jobs) {
    const li = document.createElement("li");
    li.textContent = jobText(job);
    const button = document.createElement("button");
    const isSaved = savedIds.has(job.id);
    button.textContent = isSaved ? "Saved" : "Save";
    button.disabled = isSaved;
    button.addEventListener("click", async () => {
      await fetch("/api/saved", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      await refresh();
    });
    li.append(" ", button);
    list.append(li);
  }
}

async function showSaved() {
  const res = await fetch("/api/saved");
  const jobs = await res.json();
  savedIds = new Set(jobs.map((job) => job.id));
  savedList.innerHTML = "";
  savedEmpty.hidden = jobs.length > 0;
  for (const job of jobs) {
    const li = document.createElement("li");
    li.textContent = jobText(job);
    const button = document.createElement("button");
    button.textContent = "Remove";
    button.addEventListener("click", async () => {
      await fetch(`/api/saved/${encodeURIComponent(job.id)}`, { method: "DELETE" });
      await refresh();
    });
    li.append(" ", button);
    savedList.append(li);
  }
}

async function refresh() {
  await showSaved();
  await showJobs(search.value);
}

search.addEventListener("input", () => showJobs(search.value));
refresh();
