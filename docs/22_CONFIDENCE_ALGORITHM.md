# Algoritma Confidence Score

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

Implementasi: `web-client/lib/confidence.ts` (fungsi murni, 13 unit test). Memenuhi FR-011.

## Parameter (default, dapat di-override)

| Parameter | Nilai |
|---|---|
| Jendela data | 30 menit (`CONFIDENCE_WINDOW_MINUTES`) |
| Half-life peluruhan | 10 menit (`CONFIDENCE_HALF_LIFE_MINUTES`) |
| Bobot sumber | CCTV 0,40 · TRAFFIC_API 0,35 · CROWDSOURCE 0,25 |

Bobot dan ambang adalah **nilai awal yang belum dikalibrasi** dengan data nyata; tinjau setelah data terkumpul.

## Rumus

1. Untuk tiap log dalam jendela: `decay = 0,5^(umur / halfLife)`; `strength = (confidence_score / 100) × decay`.
2. Kekuatan kelompok `G` per (sumber, status):
   - CCTV dan TRAFFIC_API: `G = max(strength)` (pembacaan berulang tidak ditumpuk).
   - CROWDSOURCE: `G = 1 − exp(−Σ strength)` (*diminishing returns*, batas atas 1).
3. `score(status) = Σ bobot_sumber × G`. Satu sumber tidak pernah menyumbang lebih dari bobotnya; spam crowdsourcing maksimal 0,25 sehingga tidak dapat mengalahkan CCTV segar yang berbeda.
4. Pemenang = skor tertinggi. *Tie-break* berurutan: lebih banyak sumber independen; log pendukung lebih baru; keparahan lebih tinggi (KOSONG > ANTRE_PANJANG > NORMAL).
5. Confidence akhir = `round(100 × quality × agreement × coverage)` dijepit 1..100:
   - `share = skorMenang / totalSkor`; `margin = (skorMenang − runnerUp) / skorMenang`; `agreement = 0,5·share + 0,5·margin`
   - `supportW` = jumlah bobot sumber pendukung; `quality = skorMenang / supportW`; `coverage = 0,6 + 0,4 × min(1, supportW / 0,6)`
6. *Stale*: tidak ada log dalam jendela → `status = null`, `confidence = 0`, `sources = []`.

Contoh: satu CCTV segar (90) ≈ 78; CCTV dan Traffic sepakat ≈ 85; CCTV dan Traffic bertentangan ≈ 30.
