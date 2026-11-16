import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { FOCO_VISIVEL } from "../onboarding/selecao";

interface MetricCardProps {
  rotulo: string;
  // Número (formatado em pt-BR) ou texto pronto, como "92%" ou "Sem nota"
  valor: number | string;
  icone: LucideIcon;
  // Linha de baixo (selo + complemento)
  rodape: ReactNode;
  // Texto curto entre o valor e o rodapé
  apoio?: ReactNode;
  // Com destino, o card inteiro vira link
  para?: string;
  // Classes do grid (col-span) de quem usa o card
  className?: string;
}

const BASE = "flex h-full flex-col rounded-3xl border border-lightgray bg-white p-5 shadow-soft";

// Card de métrica da "Visão geral" (Visualizações, Interessados, Matches...)
export default function MetricCard({ rotulo, valor, icone: Icone, rodape, apoio, para, className = "" }: MetricCardProps) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-deepgreen/80">{rotulo}</p>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/25 text-deepgreen" aria-hidden="true">
          <Icone size={20} />
        </span>
      </div>
      <p className="mt-3 text-4xl font-bold tracking-tight text-deepgreen">
        {typeof valor === "number" ? valor.toLocaleString("pt-BR") : valor}
      </p>
      {apoio && <p className="mt-2 text-xs leading-relaxed text-deepgreen/80">{apoio}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-xs text-deepgreen/75">{rodape}</div>
    </>
  );

  if (para) {
    return (
      <Link to={para} className={`${BASE} transition hover:shadow-soft-lg ${FOCO_VISIVEL} ${className}`}>
        {conteudo}
      </Link>
    );
  }
  return <div className={`${BASE} ${className}`}>{conteudo}</div>;
}
