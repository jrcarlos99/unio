import { FlaskConical } from "lucide-react";

// Selo discreto dos blocos que, no modo API, ainda mostram dados de exemplo
// (o back não tem o endpoint). ADR-007.
export default function SeloExemplo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-lightgray bg-lightgray/60 px-2 py-0.5 text-[11px] font-semibold text-deepgreen ${className}`}
    >
      <FlaskConical size={12} aria-hidden="true" />
      Dados de exemplo
    </span>
  );
}
