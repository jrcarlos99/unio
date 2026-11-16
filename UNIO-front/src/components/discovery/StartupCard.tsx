import { Banknote } from "lucide-react";
import type { StartupRecomendada } from "../../types/discovery";
import { formatarMoeda } from "../../utils/formatoDescoberta";
import InteresseButton from "./InteresseButton";
import RecommendationCard from "./RecommendationCard";
import SalvarButton from "./SalvarButton";
import StartupLogo from "./StartupLogo";

interface StartupCardProps {
  item: StartupRecomendada;
  melhorMatch?: boolean;
  ocupado?: boolean;
  onSalvar: () => void;
  onInteresse: () => void;
  onDesfazer: () => void;
}

// Card da grade "Startups para você" (investidor)
export default function StartupCard({
  item,
  melhorMatch = false,
  ocupado = false,
  onSalvar,
  onInteresse,
  onDesfazer,
}: StartupCardProps) {
  const { startup, compatibilidade, statusInteresse, salvo } = item;

  return (
    <RecommendationCard
      href={`/startups/${startup.id}`}
      titulo={startup.nome}
      verificado={startup.verificada}
      rotuloVerificado="Verificada"
      subtitulo={`${startup.cidade}, ${startup.uf} • ${startup.captacao.rodada}`}
      avatar={<StartupLogo startup={startup} />}
      categoria={startup.categoria}
      match={compatibilidade.total}
      popularidade={item.popularidade}
      melhorMatch={melhorMatch}
      deuMatch={statusInteresse === "match"}
      chips={[
        { texto: startup.segmento, estilo: "neutro" },
        { texto: startup.estagio, estilo: "destaque" },
        ...(startup.tags[0] ? [{ texto: startup.tags[0], estilo: "suave" as const }] : []),
      ]}
      descricao={startup.descricao}
      principal={{ icone: Banknote, rotulo: "Captação", valor: `Busca ${formatarMoeda(startup.captacao.meta)}` }}
      secundaria={startup.metrica}
      acoes={
        <>
          <div className="min-w-0 flex-1">
            <InteresseButton
              id={startup.id}
              status={statusInteresse}
              nome={startup.nome}
              onInteresse={onInteresse}
              onDesfazer={onDesfazer}
              ocupado={ocupado}
            />
          </div>
          <SalvarButton salvo={salvo} nome={startup.nome} onClick={onSalvar} ocupado={ocupado} />
        </>
      }
    />
  );
}
