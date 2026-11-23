import { Info } from "lucide-react";

// Aviso visível de que a ação ou os dados da tela ainda não vêm do back
// (moderação sem endpoint, ADR-010)
export default function AvisoPendencia({ children }: { children: string }) {
  return (
    <p
      role="note"
      className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-deepgreen"
    >
      <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
