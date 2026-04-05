// Skeleton affiché pendant le chargement du profil artisan
export default function artisanProfilLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="h-14 bg-white border-b border-gray-100 sticky top-0 z-20 animate-pulse" />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Hero card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-5">
            <div className="w-24 h-24 rounded-2xl bg-gray-200 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-48 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded-full animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse hidden sm:block" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded-full animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
              <div className="h-5 w-3/4 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-4 w-full bg-gray-200 rounded-full animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-200 rounded-full animate-pulse" />
            </div>
          ))}
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="h-5 w-32 bg-gray-200 rounded-full animate-pulse" />
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 pt-4 border-t border-gray-50">
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-3 w-full bg-gray-200 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
