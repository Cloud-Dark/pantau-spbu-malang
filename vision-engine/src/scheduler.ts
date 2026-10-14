import { errMsg, type Logger } from "./log.ts";
import { sleep } from "./util.ts";
import type { CycleSummary } from "./sources/traffic.ts";

export interface Job {
  name: string;
  intervalSec: number;
  run(): Promise<CycleSummary | void>;
}

/**
 * Loop terjadwal. Tiap job berjalan dalam rantai sekuensial (jalankan -> tunggu interval -> ulang),
 * sehingga satu job tidak pernah tumpang tindih dengan dirinya sendiri. Berhenti rapi saat signal abort:
 * siklus yang sedang berjalan diselesaikan dulu.
 */
export async function startScheduler(jobs: Job[], log: Logger, signal: AbortSignal): Promise<void> {
  await Promise.all(
    jobs.map(async (job) => {
      log.info(`[scheduler] job "${job.name}" tiap ${job.intervalSec} detik`);
      while (!signal.aborted) {
        try {
          await job.run();
        } catch (e) {
          log.error(`[scheduler] job "${job.name}" error: ${errMsg(e)}`);
        }
        await sleep(job.intervalSec * 1000, signal);
      }
    }),
  );
  log.info("[scheduler] berhenti");
}

/** Satu siklus semua job (cron/GitHub Actions). Mengembalikan exit code. */
export async function runOnce(jobs: Job[], log: Logger): Promise<number> {
  let code = 0;
  for (const job of jobs) {
    try {
      const s = await job.run();
      // semua SPBU gagal = kemungkinan masalah sistemik (kunci salah, jaringan): tandai gagal
      if (s && s.total > 0 && s.failed === s.total) {
        log.error(`[once] job "${job.name}": semua ${s.total} item gagal`);
        code = 1;
      }
    } catch (e) {
      log.error(`[once] job "${job.name}" error: ${errMsg(e)}`);
      code = 1;
    }
  }
  return code;
}
