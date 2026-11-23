import { Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import type { InvestidorRecomendado } from "../../types/investidores";
import { formatarFaixaTicket } from "../../utils/formatoDescoberta";
import { iniciais } from "../../utils/nomeUsuario";
import { FOCO_VISIVEL } from "../onboarding/selecao";

// Card de um investidor recomendado. Só "Ver perfil": antes do match mútuo
// a startup não manda mensagem nem agenda com o investidor.
export default function RecommendedInvestorCard({ item }: { item: InvestidorRecomendado }) {
  const { investidor, compatibilidade } = item;
  const temTicket = investidor.ticketMin !== null && investidor.ticketMax !== null;
  return (
    <article className="flex flex-wrap items-center gap-4 rounded-2xl border border-lightgray bg-white p-4 sm:flex-nowrap">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sage/30 text-sm font-bold text-deepgreen"
        aria-hidden="true"
      >
        {iniciais(investidor.nome)}
      </span>

      <div className="min-w-[170px] flex-1">
        <h3 className="font-bold text-deepgreen">
          {investidor.nome}
          {investidor.verificado && (
            <BadgeCheck size={16} className="ml-1.5 inline align-[-3px]" role="img" aria-label="Verificado" />
          )}
        </h3>
        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Focos">
          {investidor.segmentosInteresse.slice(0, 2).map((foco) => (
            <li key={foco} className="rounded-md bg-lightgray/70 px-2 py-0.5 text-xs text-deepgreen">
              {foco}
            </li>
          ))}
        </ul>
        <p className="mt-1.5 whitespace-nowrap text-xs text-deepgreen/75">
          {temTicket
            ? `Ticket: ${formatarFaixaTicket(investidor.ticketMin as number, investidor.ticketMax as number)}`
            : "Só mentoria"}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <p className="text-right leading-tight">
          <span className="block text-sm font-bold text-deepgreen">{compatibilidade.total === null ? "—" : `${compatibilidade.total}%`}</span>
          <span className="text-[11px] text-deepgreen/75">afinidade</span>
        </p>
        <Link
          to={`/investidores/${investidor.id}`}
          aria-label={`Ver perfil de ${investidor.nome}`}
          className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl border border-lightgray px-3 text-sm font-medium text-deepgreen transition hover:border-sage ${FOCO_VISIVEL}`}
        >
          Ver perfil
        </Link>
      </div>
    </article>
  );
}
