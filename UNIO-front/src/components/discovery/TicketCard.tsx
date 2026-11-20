import { Banknote, Users } from "lucide-react";
import type { InvestidorDescoberta } from "../../types/investidores";
import { formatarFaixaTicket } from "../../utils/formatoDescoberta";
import SecaoPerfil from "./SecaoPerfil";

// "Ticket e atividade" do perfil do investidor (espelho do "Capital procurado
// e Rodada" do perfil da startup)
export default function TicketCard({ investidor }: { investidor: InvestidorDescoberta }) {
  const soMentora = investidor.ticketMin === null || investidor.ticketMax === null;
  const startups = investidor.portfolioPortoDigital;

  return (
    <SecaoPerfil
      titulo="Ticket e atividade"
      icone={Banknote}
      selo={
        <span className="rounded-full bg-sage/40 px-3 py-1 text-xs font-semibold text-deepgreen">
          {soMentora ? "Mentoria aberta" : "Investindo ativamente"}
        </span>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-deepgreen/75">
          {soMentora ? "Forma de apoio" : "Faixa de ticket"}
        </p>
        <p className="flex items-center gap-1.5 text-sm font-medium text-deepgreen">
          <span className="h-2 w-2 rounded-full bg-sage ring-2 ring-sage/30" aria-hidden="true" />
          Aberto a novas startups
        </p>
      </div>
      <p className="mt-2 text-4xl font-bold tracking-tight text-deepgreen sm:text-5xl">
        {soMentora
          ? "Só mentoria"
          : `Ticket ${formatarFaixaTicket(investidor.ticketMin as number, investidor.ticketMax as number, " a ")}`}
      </p>

      <dl className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-lightgray bg-lightgray/30 p-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-deepgreen/75">{soMentora ? "Startups mentoradas" : "Investimentos realizados"}</dt>
          <dd className="mt-1 text-lg font-bold text-deepgreen">{investidor.portfolio ?? "Não informado"}</dd>
        </div>
        <div>
          <dt className="text-xs text-deepgreen/75">Setores de atuação</dt>
          <dd className="mt-1 text-lg font-bold text-deepgreen">{investidor.segmentosInteresse.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-deepgreen/75">Tempo médio de resposta</dt>
          <dd className="mt-1 text-lg font-bold text-deepgreen">{investidor.tempoResposta ?? "Não informado"}</dd>
        </div>
      </dl>

      {/* Só nos dados de exemplo: o back não tem portfólio (ADR-008) */}
      {startups !== null && (
        <p className="mt-5 flex items-center gap-2 text-sm text-deepgreen/80">
          <Users size={16} aria-hidden="true" />
          <span>
            <strong className="font-semibold text-deepgreen">
              {startups} {startups === 1 ? "startup" : "startups"} do Porto Digital
            </strong>{" "}
            no portfólio
          </span>
        </p>
      )}
    </SecaoPerfil>
  );
}
