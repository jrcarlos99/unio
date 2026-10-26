export default function DocumentsSkeleton() {
  return (
    <div role="status" className="mt-5">
      <span className="sr-only">Carregando documentos…</span>
      <div aria-hidden="true">
        <div className="animate-pulse rounded-3xl border border-lightgray bg-white p-5 shadow-soft">
          <div className="h-4 w-1/3 rounded bg-lightgray" />
          <div className="mt-3 h-2 rounded-full bg-lightgray" />
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-11 rounded-2xl bg-lightgray/70" />
            ))}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="animate-pulse rounded-3xl border border-lightgray bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-lightgray" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-lightgray" />
                  <div className="h-3 w-1/3 rounded bg-lightgray" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 rounded bg-lightgray" />
                <div className="h-3 w-5/6 rounded bg-lightgray" />
              </div>
              <div className="mt-4 border-t border-lightgray pt-3">
                <div className="h-3 w-1/4 rounded bg-lightgray" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
