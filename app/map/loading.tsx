// Skeleton affiché pendant le chargement du Server Component /map
export default function MapLoading() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Navbar skeleton */}
      <header className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-4 w-px bg-gray-200 hidden sm:block" />
          <div className="h-4 w-36 bg-gray-200 rounded-full animate-pulse hidden sm:block" />
        </div>
        <div className="h-7 w-28 bg-gray-200 rounded-full animate-pulse" />
      </header>

      {/* Map skeleton */}
      <main className="flex-1 relative bg-gray-100 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gray-300 animate-pulse mx-auto mb-3" />
            <div className="h-4 w-32 bg-gray-300 rounded-full animate-pulse mx-auto" />
          </div>
        </div>
      </main>
    </div>
  );
}
