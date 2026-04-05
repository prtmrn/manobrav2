// ─── Skeleton shown while the recherche server component is loading ───────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Photo skeleton */}
      <div className="h-40 bg-gray-200 animate-pulse" />
      {/* Body */}
      <div className="p-4 space-y-2.5">
        <div className="h-4 bg-gray-200 rounded-full animate-pulse w-3/4" />
        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-1/2" />
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-3.5 h-3.5 rounded bg-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="flex justify-between pt-1">
          <div className="h-3 bg-gray-200 rounded-full animate-pulse w-1/3" />
          <div className="h-3 bg-gray-200 rounded-full animate-pulse w-1/4" />
        </div>
      </div>
    </div>
  );
}

export default function RechercheLoading() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Nav skeleton */}
      <div className="h-14 bg-white border-b border-gray-100 sticky top-0 z-20" />

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header skeleton */}
        <div className="mb-6 space-y-2">
          <div className="h-7 w-64 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-4 w-44 bg-gray-200 rounded-full animate-pulse" />
        </div>

        {/* Filter bar skeleton */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2 mb-6">
          <div className="flex-1 h-11 rounded-xl bg-gray-200 animate-pulse" />
          <div className="hidden sm:block w-44 h-11 rounded-xl bg-gray-200 animate-pulse" />
          <div className="w-28 h-11 rounded-xl bg-gray-200 animate-pulse" />
          <div className="w-32 h-11 rounded-xl bg-gray-200 animate-pulse" />
          <div className="hidden sm:block w-20 h-11 rounded-xl bg-gray-200 animate-pulse" />
        </div>

        {/* Results count skeleton */}
        <div className="h-4 w-40 bg-gray-200 rounded-full animate-pulse mb-5" />

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
