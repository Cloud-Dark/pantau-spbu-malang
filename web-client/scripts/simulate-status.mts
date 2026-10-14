import { neon } from "@neondatabase/serverless";

process.loadEnvFile?.(".env.local");
const sql = neon(process.env.DATABASE_URL!);

const statuses = ["NORMAL", "ANTRE_PANJANG", "KOSONG"] as const;
const [spbu] = await sql.query("select id, name from spbu_locations order by random() limit 1");
if (!spbu) throw new Error("Tabel spbu_locations kosong; jalankan npm run db:seed");
const status = statuses[Math.floor(Math.random() * statuses.length)];
await sql.query(
  "insert into status_logs (spbu_id, status, source, confidence_score) values ($1, $2, 'CROWDSOURCE', $3)",
  [spbu.id, status, 50 + Math.floor(Math.random() * 50)],
);
console.log(`${spbu.name} -> ${status}`);
