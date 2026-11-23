import {
  BarChart3,
  Bookmark,
  CalendarDays,
  CalendarX,
  CircleAlert,
  Gauge,
  Handshake,
  Users,
  type LucideIcon,
} from "lucide-react";
import BarListCard from "../../../components/dashboard/BarListCard";
import DonutCard from "../../../components/dashboard/DonutCard";
import GaugeCard from "../../../components/dashboard/GaugeCard";
import MetricCard from "../../../components/dashboard/MetricCard";
import PainelCard from "../../../components/dashboard/PainelCard";
import AvisoEstado from "../../../components/discovery/AvisoEstado";
import CabecalhoPagina from "../../../components/discovery/CabecalhoPagina";
import { BOTAO_SECUNDARIO } from "../../../components/reunioes/estilos";
import EsqueletoBlocos from "../../../components/ui/EsqueletoBlocos";
import { useCarregamento } from "../../../hooks/useDescoberta";
import { obterVisaoGeralAdmin } from "../../../services/adminService";

// Mesmo grid de métricas e de painéis da Visão geral da startup
const GRID_METRICAS = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4";
const GRID_PAINEIS = "mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3";
// Terceiro painel: linha inteira enquanto o grid tem duas colunas
const PAINEL_LARGO = "lg:col-span-2 2xl:col-span-1";

// Ícone e texto de apoio de cada número do back (os rótulos vêm de
// services/admin.mapping.ts)
const DETALHE_METRICA: Record<string, { icone: LucideIcon; rodape: string }> = {
  "Matches mútuos": { icone: Handshake, rodape: "interesse dos dois lados" },
  "Interesses enviados": { icone: Bookmark, rodape: "registrados na plataforma" },
  Reuniões: { icone: CalendarDays, rodape: "solicitadas, em qualquer situação" },
};

// Painel sem dados: o mesmo aviso de estado vazio da Visão geral da startup
function PainelVazio({
  titulo,
  icone,
  texto,
  className,
}: {
  titulo: string;
  icone: LucideIcon;
  texto: string;
  className?: string;
}) {
  return (
    <PainelCard titulo={titulo} className={className}>
      <AvisoEstado icone={icone} titulo="Ainda sem dados" texto={texto} />
    </PainelCard>
  );
}

// Visão geral do administrador: números da plataforma, todos de
// GET /api/admin/metrics (ADR-010 e ADR-011). Mesmo layout, cards e painéis
// da Visão geral da startup (ADR-014).
export default function VisaoGeral() {
  const { carregando, erro, dados, recarregar } = useCarregamento(
    obterVisaoGeralAdmin,
    "Não foi possível carregar as métricas.",
  );

  let conteudo;
  if (carregando) {
    conteudo = (
      <>
        <EsqueletoBlocos rotulo="Carregando métricas" quantidade={4} altura="h-44" className={GRID_METRICAS} />
        <EsqueletoBlocos quantidade={3} altura="h-80" className={GRID_PAINEIS} />
      </>
    );
  } else if (erro || !dados) {
    conteudo = (
      <AvisoEstado
        erro
        icone={CircleAlert}
        titulo="Não foi possível carregar as métricas"
        texto={erro ?? undefined}
        acao={
          <button type="button" onClick={recarregar} className={BOTAO_SECUNDARIO}>
            Tentar novamente
          </button>
        }
      />
    );
  } else {
    const cadastros = dados.totalStartups + dados.totalInvestidores;
    conteudo = (
      <>
        <div className={GRID_METRICAS}>
          <MetricCard
            rotulo="Cadastros na plataforma"
            valor={cadastros}
            icone={Users}
            para="/admin/cadastros"
            rodape={`${dados.totalStartups.toLocaleString("pt-BR")} startups e ${dados.totalInvestidores.toLocaleString(
              "pt-BR",
            )} investidores com perfil criado`}
          />
          {dados.metricas.map((metrica) => {
            const detalhe = DETALHE_METRICA[metrica.label] ?? { icone: BarChart3, rodape: "total na plataforma" };
            return (
              <MetricCard
                key={metrica.label}
                rotulo={metrica.label}
                valor={metrica.valor}
                icone={detalhe.icone}
                rodape={detalhe.rodape}
              />
            );
          })}
        </div>

        <div className={GRID_PAINEIS}>
          <GaugeCard
            titulo="Avaliação das reuniões"
            subtitulo="Média das notas das reuniões, convertida para 0 a 100%"
            percentual={dados.avaliacao.percentual}
            legenda={dados.avaliacao.legenda}
          />
          {dados.reunioesPorStatus.length > 0 ? (
            <DonutCard
              titulo="Reuniões por status"
              subtitulo="Todas as reuniões solicitadas na plataforma"
              dados={dados.reunioesPorStatus.map((fatia) => ({ rotulo: fatia.segmento, quantidade: fatia.quantidade }))}
            />
          ) : (
            <PainelVazio titulo="Reuniões por status" icone={CalendarX} texto="Nenhuma reunião marcada ainda." />
          )}
          {dados.scoresPorClassificacao.length > 0 ? (
            <BarListCard
              titulo="Scores por classificação"
              subtitulo="Compatibilidade calculada entre startups e investidores"
              dados={dados.scoresPorClassificacao.map((item) => ({ rotulo: item.local, quantidade: item.quantidade }))}
              className={PAINEL_LARGO}
            />
          ) : (
            <PainelVazio
              titulo="Scores por classificação"
              icone={Gauge}
              texto="Nenhum score calculado ainda."
              className={PAINEL_LARGO}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <div>
      <CabecalhoPagina titulo="Visão geral" subtitulo="Números da plataforma, direto do back-end." />
      {conteudo}
    </div>
  );
}
