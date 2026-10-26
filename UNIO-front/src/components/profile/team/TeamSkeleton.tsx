export default function TeamSkeleton() {
  return (
    <div role="status" className="mt-5">
      <span className="sr-only">Carregando equipe…</span>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-hidden="true">
        {[0, 1].map((index) => (
          <div key={index} className="animate-pulse rounded-3xl border border-lightgray bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-lightgray" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded bg-lightgray" />
                <div className="h-3 w-1/3 rounded bg-lightgray" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 rounded bg-lightgray" />
              <div className="h-3 w-5/6 rounded bg-lightgray" />
            </div>
            <div className="mt-4 flex gap-1.5 border-t border-lightgray pt-4">
              <div className="h-5 w-20 rounded-md bg-lightgray" />
              <div className="h-5 w-16 rounded-md bg-lightgray" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
