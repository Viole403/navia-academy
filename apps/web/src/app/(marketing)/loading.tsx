export default function MarketingLoading() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="h-6 w-64 animate-pulse rounded-full bg-line/60" />
      <div className="h-6 w-96 animate-pulse rounded-full bg-line/60" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 w-full animate-pulse rounded-2xl border border-line bg-sunken" />
        ))}
      </div>
    </main>
  );
}
