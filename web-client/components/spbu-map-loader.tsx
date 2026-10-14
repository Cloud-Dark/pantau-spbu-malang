"use client";

import dynamic from "next/dynamic";

// Leaflet membutuhkan `window`, jadi dirender hanya di klien.
const SpbuMap = dynamic(() => import("./spbu-map"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm">Memuat peta…</p>,
});

export default function SpbuMapLoader() {
  return <SpbuMap />;
}
