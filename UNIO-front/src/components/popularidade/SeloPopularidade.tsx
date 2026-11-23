import { TrendingUp } from "lucide-react";

interface SeloPopularidadeProps {
  // Percentual visível (0 a 100). Nulo ou indefinido: o selo não aparece.
  percentual: number | null | undefined;
  tamanho?: "sm" | "md";
  className?: string;
}

const TAMANHOS = {
  sm: "gap-1 px-2 py-0.5 text-[11px]",
  md: "gap-1 px-3 py-1 text-xs",
};

// Selo discreto "Popularidade 92%" (cards de descoberta e perfil visto pelo
// outro lado). Só aparece com o mínimo de avaliações; sem lista de
// avaliações, nomes ou comentários. Texto verde profundo sobre sálvia claro
// (mesmo par de cores dos outros selos, contraste AA).
export default function SeloPopularidade({ percentual, tamanho = "sm", className = "" }: SeloPopularidadeProps) {
  if (typeof percentual !== "number") return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-sage/30 font-semibold text-deepgreen ${TAMANHOS[tamanho]} ${className}`}
      title="Média das notas recebidas depois de reuniões"
    >
      <TrendingUp size={tamanho === "sm" ? 11 : 13} aria-hidden="true" />
      Popularidade {percentual}%
    </span>
  );
}
