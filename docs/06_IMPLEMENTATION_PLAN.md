# Rencana Implementasi

> Status: Draft
> Terakhir diperbarui: 2026-10-14
> Pemilik: satset-dev

Mengikuti roadmap empat fase pada [01_PRD.md](01_PRD.md). Rincian per fitur ada di folder [plans/](plans/).

| Fase | Fokus | Dependensi | Rencana rinci |
|---|---|---|---|
| 1 | MVP dan scaffolding (solo) | — | [plans/2026-10-14-phase-1-mvp-scaffolding.md](plans/2026-10-14-phase-1-mvp-scaffolding.md) |
| 2 | Crowdsourcing dan geofencing | Fase 1 (tabel, peta) | ✅ [21_BACKEND.md](21_BACKEND.md) |
| 3 | Vision engine dan Traffic API | Fase 1 (tabel `status_logs`); izin CCTV | ✅ kode · [23_VISION_ENGINE.md](23_VISION_ENGINE.md) |
| 4 | Rilis publik dan otomasi | Fase 2 dan 3 (tiga sumber data) | ✅ kode · [22_CONFIDENCE_ALGORITHM.md](22_CONFIDENCE_ALGORITHM.md), [promosi/](promosi/) |

Fase 2 dan 3 dapat berjalan paralel setelah Fase 1 selesai karena keduanya hanya bergantung pada skema database.
