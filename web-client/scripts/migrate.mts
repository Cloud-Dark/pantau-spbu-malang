import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Muat .env.local bila ada (dotenv/config hanya membaca .env).
process.loadEnvFile?.(".env.local");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL belum diatur");
const sql = neon(url);

const run = async (file: string) => {
  const statements = readFileSync(file, "utf8")
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
  for (const s of statements) await sql.query(s);
};

await sql.query(
  "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
);
const applied = new Set(
  (await sql.query("select name from schema_migrations")).map((r) => r.name as string),
);

const dir = join(import.meta.dirname, "..", "db", "migrations");
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(f)) continue;
  await run(join(dir, f));
  await sql.query("insert into schema_migrations (name) values ($1)", [f]);
  console.log("applied", f);
}

if (process.argv.includes("--seed")) {
  await run(join(dir, "..", "seed.sample.sql"));
  console.log("seed sample selesai");
}
