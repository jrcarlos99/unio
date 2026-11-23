import { TrendingUp } from "lucide-react";
import type { Popularidade } from "../../types/avaliacoes";
import { MIN_AVALIACOES_EXIBIR } from "../../utils/popularidade";
import MetricCard from "../dashboard/MetricCard";

interface CardPopularidadeProps {
  carregando: boolean;
  erro: boolean;
  dados: Popularidade | null;
  className?: string;
  // Texto de apoio (cada tela tem o seu)
  apoio?: string;
}

// Card "Popularidade" (Visão geral da startup e aba Popularidade do
// investidor): a porcentagem grande e quantas avaliações a sustentam. Só
// números: nada de nomes, notas individuais ou comentários.
export default function CardPopularidade({ carregando, erro, dados, className, apoio }: CardPopularidadeProps) {
  let valor: string;
  let rodape: string;
  if (carregando) {
    valor = "...";
    rodape = "Carregando popularidade";
  } else if (erro || !dados) {
    valor = "Sem nota";
    rodape = "Não foi possível carregar a popularidade.";
  } else if (dados.visivel && dados.percentual !== null) {
    valor = `${dados.percentual}%`;
    rodape = `Baseada em ${dados.totalAvaliacoes} avaliações de reuniões`;
  } else {
    const faltam = Math.max(1, MIN_AVALIACOES_EXIBIR - dados.totalAvaliacoes);
    valor = "Sem nota";
    rodape = `Ainda sem avaliações suficientes (faltam ${faltam})`;
  }

  return (
    <MetricCard
      rotulo="Popularidade"
      valor={valor}
      icone={TrendingUp}
      apoio={apoio}
      rodape={<span aria-live="polite">{rodape}</span>}
      className={className}
    />
  );
}
