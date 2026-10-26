export default function ProfilePageSkeleton({ label = "Carregando perfil da startup" }: { label?: string }) {
  const block = "animate-pulse rounded-3xl bg-lightgray";
  return (
    <div aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className={`h-[36rem] lg:col-span-3 ${block}`} />
        <div className={`h-96 lg:col-span-2 ${block}`} />
      </div>
    </div>
  );
}
