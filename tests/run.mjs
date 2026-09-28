// Local test runner: a throwaway database in the LOCAL Postgres + its own dev server, then the role tests.
//   TEST_PG=postgresql://postgres@localhost:5433/postgres?host=/tmp npm run test:roles
// It refuses any database that is not on this machine, creates a new database (ib_test_<time>), applies the
// migrations, runs tests/roles.mjs against http://localhost:3107 and drops that database afterwards.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PG = process.env.TEST_PG || "postgresql://postgres@localhost:5433/postgres?host=/tmp";
const host = new URL(PG).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error("TEST_PG must point to a local Postgres (got host " + host + "). Tests never run against a shared database.");
  process.exit(2);
}
const DB = "ib_test_" + Date.now().toString(36);
const url = (db) => { const u = new URL(PG); u.pathname = "/" + db; return u.toString(); };
const TEST_URL = url(DB), PORT = 3107, BASE = `http://localhost:${PORT}/`;
const OUTBOX = path.join(os.tmpdir(), DB + "-outbox.jsonl");
const sql = (dbUrl, q) => {
  const r = spawnSync("npx", ["prisma", "db", "execute", "--url", dbUrl, "--stdin"], { input: q, encoding: "utf8" });
  if (r.status !== 0) throw new Error("SQL failed: " + q + "\n" + r.stderr);
};

let server;
const stop = () => { try { server && process.kill(-server.pid, "SIGTERM"); } catch {} };
let code = 1;
try {
  sql(PG, `CREATE DATABASE "${DB}"`);
  // The migration folders are numbered 0, 1, 2 … 21, but `prisma migrate deploy` sorts them as text (10 before 2),
  // which only works on the live database that got them one by one. Apply them in number order instead.
  const dirs = fs.readdirSync("prisma/migrations").filter((d) => /^\d+_/.test(d)).sort((a, b) => parseInt(a) - parseInt(b));
  for (const d of dirs) sql(TEST_URL, fs.readFileSync(path.join("prisma/migrations", d, "migration.sql"), "utf8"));
  fs.writeFileSync(OUTBOX, "");
  server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    env: { ...process.env, DATABASE_URL: TEST_URL, DATABASE_URL_UNPOOLED: TEST_URL, MAIL_OUTBOX_FILE: OUTBOX, NEXT_DIST_DIR: ".next-test", NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"], detached: true,
  });
  let log = ""; server.stdout.on("data", (b) => (log += b)); server.stderr.on("data", (b) => (log += b));
  for (let i = 0; ; i++) {
    try { if ((await fetch(BASE + "api/ib", { method: "POST", body: '{"action":"config"}' })).ok) break; } catch {}
    if (i > 120) throw new Error("test server did not start\n" + log.slice(-3000));
    await new Promise((r) => setTimeout(r, 1000));
  }
  const { run } = await import("./roles.mjs");
  await run({ BASE, OUTBOX, makeAdmin: (email) => sql(TEST_URL, `UPDATE "User" SET role = 'ADMIN' WHERE email = '${email.replace(/'/g, "")}'`), sql: (q) => sql(TEST_URL, q) });
  code = 0;
} catch (e) {
  console.error(e);
} finally {
  stop();
  await new Promise((r) => setTimeout(r, 1500));
  try { sql(PG, `DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); } catch (e) { console.error("could not drop " + DB, e.message); }
  try { fs.unlinkSync(OUTBOX); } catch {}
}
process.exit(code);
