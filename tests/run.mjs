// Local test runner: a throwaway database in the LOCAL Postgres + its own dev server, then the role tests.
//   TEST_PG=postgresql://postgres@localhost:5433/postgres?host=/tmp npm run test:roles
// It refuses any database that is not on this machine. Per suite (roles+cells, newmember, finance) it creates a new
// database (ib_test_<time>), applies the migrations, runs the tests against http://localhost:3107 and drops that
// database afterwards. `npm run test:roles -- finance` runs only the suites named.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const PG = process.env.TEST_PG || "postgresql://postgres@localhost:5433/postgres?host=/tmp";
const host = new URL(PG).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error("TEST_PG must point to a local Postgres (got host " + host + "). Tests never run against a shared database.");
  process.exit(2);
}
const url = (db) => { const u = new URL(PG); u.pathname = "/" + db; return u.toString(); };
const PORT = 3107, BASE = `http://localhost:${PORT}/`;
const sql = (dbUrl, q) => {
  const r = spawnSync("npx", ["prisma", "db", "execute", "--url", dbUrl, "--stdin"], { input: q, encoding: "utf8" });
  if (r.status !== 0) throw new Error("SQL failed: " + q + "\n" + r.stderr);
};

// A stand-in for the YouTube Data API (the server reaches it through IB_TEST_YT_BASE, only with IB_TEST_HOOKS=1):
// the tests fill yt.playlists / yt.titles, like __yt in the reference gas-mock.js. No real key, no real YouTube.
const yt = { titles: {}, playlists: {} };
const ytServer = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), q = (k) => u.searchParams.get(k) || "";
  let body = { items: [] };
  if (u.pathname.endsWith("/playlistItems")) body = { items: (yt.playlists[q("playlistId")] || []).map((v, i) => ({ contentDetails: { videoId: v.id }, snippet: { title: v.title, position: i }, status: { privacyStatus: v.priv || "public" } })) };
  else if (u.pathname.endsWith("/playlists")) body = { items: [{ snippet: { title: yt.titles[q("id")] || "" } }] };
  else if (u.pathname.endsWith("/videos")) {
    const all = Object.values(yt.playlists).flat();
    body = { items: q("id").split(",").map((id) => all.find((v) => v.id === id)).filter(Boolean).map((v) => ({ id: v.id, contentDetails: { duration: "PT" + v.dur + "M" } })) };
  }
  res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(body));
});
await new Promise((r) => ytServer.listen(0, "127.0.0.1", r));
const YT_BASE = `http://127.0.0.1:${ytServer.address().port}/`;

// Each suite gets its own new database and dev server, like each reference test file gets a fresh Code.gs.
const SUITES = [["roles", "cells"], ["newmember"], ["finance"]];
const only = process.argv.slice(2);
let code = 1;
try {
  for (const suite of SUITES) {
    if (only.length && !suite.some((x) => only.includes(x))) continue;
    await runSuite(suite);
  }
  code = 0;
} catch (e) {
  console.error(e);
} finally {
  ytServer.close();
}
process.exit(code);

async function runSuite(names) {
  const DB = "ib_test_" + Date.now().toString(36);
  const TEST_URL = url(DB), OUTBOX = path.join(os.tmpdir(), DB + "-outbox.jsonl");
  let server;
  try {
    sql(PG, `CREATE DATABASE "${DB}"`);
    // The migration folders are numbered 0, 1, 2 … 24, but `prisma migrate deploy` sorts them as text (10 before 2),
    // which only works on the live database that got them one by one. Apply them in number order instead.
    const dirs = fs.readdirSync("prisma/migrations").filter((d) => /^\d+_/.test(d)).sort((a, b) => parseInt(a) - parseInt(b));
    for (const d of dirs) sql(TEST_URL, fs.readFileSync(path.join("prisma/migrations", d, "migration.sql"), "utf8"));
    fs.writeFileSync(OUTBOX, "");
    server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
      env: { ...process.env, DATABASE_URL: TEST_URL, DATABASE_URL_UNPOOLED: TEST_URL, MAIL_OUTBOX_FILE: OUTBOX, NEXT_DIST_DIR: ".next-test", NODE_ENV: "development", IB_TEST_HOOKS: "1",
        YOUTUBE_API_KEY: "test-key-not-real", IB_TEST_YT_BASE: YT_BASE },
      stdio: ["ignore", "pipe", "pipe"], detached: true,
    });
    let log = ""; server.stdout.on("data", (b) => (log += b)); server.stderr.on("data", (b) => (log += b));
    for (let i = 0; ; i++) {
      try { if ((await fetch(BASE + "api/ib", { method: "POST", body: '{"action":"config"}' })).ok) break; } catch {}
      if (i > 120) throw new Error("test server did not start\n" + log.slice(-3000));
      await new Promise((r) => setTimeout(r, 1000));
    }
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient({ datasources: { db: { url: TEST_URL } } });
    const ctx = { BASE, OUTBOX, db, yt, makeAdmin: (email) => sql(TEST_URL, `UPDATE "User" SET role = 'ADMIN' WHERE email = '${email.replace(/'/g, "")}'`), sql: (q) => sql(TEST_URL, q) };
    try {
      // cells runs after roles on the same database: it reuses the admin and courses made there.
      for (const name of names) await (await import("./" + name + ".mjs")).run(ctx);
    } finally { await db.$disconnect(); }
  } finally {
    try { server && process.kill(-server.pid, "SIGTERM"); } catch {}
    await new Promise((r) => setTimeout(r, 1500));
    try { sql(PG, `DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); } catch (e) { console.error("could not drop " + DB, e.message); }
    try { fs.unlinkSync(OUTBOX); } catch {}
  }
}
