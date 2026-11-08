// Loading state of the "Pitch & Lean Canvas" page: tabs + two columns
export default function PitchPageSkeleton() {
  const block = "animate-pulse rounded-3xl bg-lightgray";
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando pitch e Lean Canvas</span>
      <div className="h-12 w-64 animate-pulse rounded-2xl bg-lightgray" />
      <div className="mt-4 h-14 animate-pulse rounded-2xl bg-lightgray" />
      {/* Same columns as the Pitch tab (pages/startup/PitchCanvas.tsx) */}
      <div className="mt-6 @container">
        <div className="grid grid-cols-1 gap-6 @[56rem]:grid-cols-5 @[90rem]:grid-cols-3">
          <div className="space-y-6 @[56rem]:col-span-3 @[90rem]:col-span-2">
            <div className={`h-96 ${block}`} />
            <div className={`h-64 ${block}`} />
          </div>
          <div className={`h-[28rem] @[56rem]:col-span-2 @[90rem]:col-span-1 ${block}`} />
        </div>
      </div>
    </div>
  );
}
