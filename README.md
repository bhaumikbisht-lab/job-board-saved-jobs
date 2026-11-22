# Job board starter

A small job board for an insiderOne work sample. It is made up: the jobs and
companies are not real.

## Run it

You need Node 20 or newer. There are no packages to install.

```
npm start      # then open http://localhost:3000
npm test       # runs the tests in test/
```

## What is here

- `server.js`: the web server. `GET /api/jobs?q=` lists jobs, `GET /` serves the page.
- `lib/jobs.js`: reading and searching the jobs. Pure functions.
- `lib/saved.js`: the saved-jobs store (see below).
- `saved.json`: the ids of the saved jobs, written by the server.
- `jobs.json`: the jobs.
- `public/`: the page and its script.
- `test/`: tests, using Node's built-in test runner.

## Saved jobs: what I built

Students can now save the jobs they like and come back to them:

- Every job in the list has a **Save** button (it reads "Saved" once saved).
  Below the list, a **Saved jobs** section shows the saved jobs, each with a
  **Remove** button.
- The API behind it: `POST /api/saved` with `{ "jobId": "..." }`,
  `GET /api/saved`, and `DELETE /api/saved/:jobId`.
- Saving the same job twice keeps one copy. An unknown job id gets a clear
  `404` error (`Unknown job id: ...`), never a crash, and removing a job that
  is not saved also returns `404`.
- Saved jobs survive a page reload and a server restart: the ids are kept in
  `saved.json` on the server (`lib/saved.js`).

Run it the same way as the starter: `npm start`, then open
http://localhost:3000. `npm test` runs the starter's tests plus new tests in
`test/saved.test.js` for the store and the API: saving twice, removing,
unknown ids, and persistence across a restart.

**One decision I made:** `saved.json` stores only the job ids, never copies of
the jobs. The details are looked up from `jobs.json` on every read, so there
is a single source of truth: if a job's stipend or location is ever edited,
the saved list shows the new details instead of a stale copy. The trade-off
is one extra lookup per read, which is nothing at this size.

**What I would do next:** saved jobs are currently shared by everyone who
opens the page, because there is no sign-in. The next step would be one saved
list per student, and moving the store behind the same small functions in
`lib/saved.js` to a real database once more than one server is involved.
