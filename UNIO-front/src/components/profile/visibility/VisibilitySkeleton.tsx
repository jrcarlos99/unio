export default function VisibilitySkeleton() {
  return (
    <div role="status" className="mt-5">
      <span className="sr-only">Carregando preferências de visibilidade…</span>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5" aria-hidden="true">
        <div className="space-y-6 lg:col-span-3">
          {[2, 5].map((rows) => (
            <div key={rows} className="animate-pulse rounded-3xl border border-lightgray bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-lightgray" />
                <div className="h-4 w-1/2 rounded bg-lightgray" />
              </div>
              <div className="mt-5 space-y-3">
                {Array.from({ length: rows }, (_, index) => (
                  <div key={index} className="h-12 rounded-2xl bg-lightgray/70" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="animate-pulse rounded-3xl border border-lightgray bg-white p-5 shadow-soft lg:col-span-2">
          <div className="h-4 w-2/3 rounded bg-lightgray" />
          <div className="mt-5 h-56 rounded-3xl bg-lightgray/70" />
        </div>
      </div>
    </div>
  );
}
