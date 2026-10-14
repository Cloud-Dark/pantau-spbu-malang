// Utilitas geospasial. Dipakai server (verifikasi geofence) dan boleh dipakai klien.

/** Radius geofence: pelapor harus berada dalam jarak ini dari SPBU (PRD / ADR-004). */
export const GEOFENCE_RADIUS_M = 100;

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Jarak lingkaran besar (meter) antara dua koordinat, rumus haversine. */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}
