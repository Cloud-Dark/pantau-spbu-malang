import { ConfigError, loadEnvFile, parseConfig } from "./config.ts";
import { createDb } from "./db.ts";
import { buildJobs } from "./engine.ts";
import { errMsg, logger as log } from "./log.ts";
import { createRepo } from "./repo.ts";
import { runOnce, startScheduler } from "./scheduler.ts";

const USAGE = "Pemakaian: tsx src/index.ts <start|once>";

async function main(): Promise<number> {
  const mode = process.argv[2];
  if (mode !== "start" && mode !== "once") {
    console.error(USAGE);
    return 2;
  }
  loadEnvFile();
  const cfg = parseConfig(process.env);
  if (!cfg.databaseUrl) throw new ConfigError(["DATABASE_URL wajib diisi"]);
  if (cfg.dryRun) log.warn("DRY_RUN aktif: tidak ada yang ditulis ke status_logs");

  const repo = createRepo(createDb(cfg.databaseUrl), { dryRun: cfg.dryRun, log });
  const jobs = await buildJobs(cfg, repo, log);

  if (mode === "once") return runOnce(jobs, log);

  const ac = new AbortController();
  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.once(sig, () => {
      log.info(`menerima ${sig}, menyelesaikan siklus berjalan lalu berhenti...`);
      ac.abort();
    });
  }
  await startScheduler(jobs, log, ac.signal);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    log.error(e instanceof ConfigError ? e.message : `fatal: ${errMsg(e)}`);
    process.exit(1);
  },
);
