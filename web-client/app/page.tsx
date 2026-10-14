import SpbuMapLoader from "@/components/spbu-map-loader";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col">
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">⛽ Pantau SPBU Malang</h1>
        <p className="text-xs text-zinc-500">Status ketersediaan BBM dan antrean, diperbarui otomatis.</p>
      </header>
      <div className="min-h-0 flex-1">
        <SpbuMapLoader />
      </div>
    </main>
  );
}
