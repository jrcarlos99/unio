export default function HomeSkeleton() {
  const block = "animate-pulse rounded-2xl bg-lightgray";

  return (
    <div aria-busy="true" aria-label="Carregando página inicial">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className={`h-7 w-56 ${block}`} />
          <div className={`h-4 w-40 ${block}`} />
        </div>
        <div className={`h-9 w-56 rounded-full ${block}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`h-64 ${block}`} />
        <div className={`h-64 lg:col-span-2 ${block}`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`h-48 ${block}`} />
        <div className={`h-48 ${block}`} />
      </div>
    </div>
  );
}
