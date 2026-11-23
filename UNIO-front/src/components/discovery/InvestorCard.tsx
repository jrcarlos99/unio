import { Banknote, HandHelping } from "lucide-react";
import type { InvestidorRecomendado } from "../../types/investidores";
import { formatarFaixaTicket } from "../../utils/formatoDescoberta";
import { juntarPartes, localDoInvestidor } from "../../utils/perfilDescoberta";
import AvatarIniciais from "./AvatarIniciais";
import InteresseButton from "./InteresseButton";
import RecommendationCard from "./RecommendationCard";
import SalvarButton from "./SalvarButton";
import { rotuloTipoInvestidor } from "./rotulos";

interface InvestorCardProps {
  item: InvestidorRecomendado;
  melhorMatch?: boolean;
  ocupado?: boolean;
  onSalvar: () => void;
  onInteresse: () => void;
  onDesfazer: () => void;
}

// Card de um investidor para a startup (aba Investidores e Salvos)
export default function InvestorCard({
  item,
  melhorMatch = false,
  ocupado = false,
  onSalvar,
  onInteresse,
  onDesfazer,
}: InvestorCardProps) {
  const { investidor, compatibilidade, statusInteresse, salvo } = item;
  const [segmento1, segmento2] = investidor.segmentosInteresse;
  const soMentora = investidor.ticketMin === null || investidor.ticketMax === null;

  return (
    <RecommendationCard
      href={`/investidores/${investidor.id}`}
      titulo={investidor.nome}
      verificado={investidor.verificado}
      rotuloVerificado="Verificado"
      subtitulo={juntarPartes(localDoInvestidor(investidor), rotuloTipoInvestidor(investidor.tipo))}
      avatar={<AvatarIniciais nome={investidor.nome} />}
      categoria={investidor.segmentosInteresse.slice(0, 2).join(" & ")}
      match={compatibilidade.total}
      popularidade={item.popularidade}
      melhorMatch={melhorMatch}
      deuMatch={statusInteresse === "match"}
      chips={[
        ...(segmento1 ? [{ texto: segmento1, estilo: "neutro" as const }] : []),
        ...investidor.estagiosInteresse.slice(0, 1).map((texto) => ({ texto, estilo: "destaque" as const })),
        ...(segmento2 ? [{ texto: segmento2, estilo: "suave" as const }] : []),
      ]}
      descricao={investidor.tese}
      principal={
        soMentora
          ? { icone: HandHelping, rotulo: "Atuação", valor: "Só mentoria" }
          : {
              icone: Banknote,
              rotulo: "Ticket",
              valor: formatarFaixaTicket(investidor.ticketMin as number, investidor.ticketMax as number, " a "),
            }
      }
      secundaria={
        soMentora || investidor.portfolio === null
          ? investidor.disponibilidade
            ? { rotulo: "Disponibilidade", valor: investidor.disponibilidade }
            : undefined
          : { rotulo: "Investimentos", valor: `${investidor.portfolio} startups` }
      }
      acoes={
        <>
          <div className="min-w-0 flex-1">
            <InteresseButton
              id={investidor.id}
              status={statusInteresse}
              nome={investidor.nome}
              aguardando="Aguardando o investidor"
              onInteresse={onInteresse}
              onDesfazer={onDesfazer}
              ocupado={ocupado}
            />
          </div>
          <SalvarButton salvo={salvo} nome={investidor.nome} onClick={onSalvar} ocupado={ocupado} />
        </>
      }
    />
  );
}
