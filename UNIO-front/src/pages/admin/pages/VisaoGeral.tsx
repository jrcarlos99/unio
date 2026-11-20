import { Link } from "react-router-dom";
import AdminPageHeader from "../components/AdminPageHeader";
import MetricCard from "../components/MetricCard";
import GaugeCard from "../components/GaugeCard";
import DonutCard from "../components/DonutCard";
import RegionCard from "../components/RegionCard";
import HighlightCard from "../components/HighlightCard";
import {
  AVATARES_ATIVOS,
  CADASTROS_PENDENTES,
  CADASTROS_POR_REGIAO,
  DISTRIBUICAO_SEGMENTO,
  METRICAS,
  STARTUPS_ATIVAS,
  TAXA_APROVACAO,
} from "../data/mockAdmin";
import { useCarregamento } from "../../../hooks/useDescoberta";
import { ADMIN_REAL, obterVisaoGeralAdmin } from "../../../services/adminService";

// Dashboard de métricas, no estilo dos dashboards de analytics/fintech:
// 3 cards de número no topo, 3 cards de gráfico no meio e 2 cards de
// destaque maiores embaixo. Modo API: GET /api/admin/metrics; modo mock:
// dados de exemplo de mockAdmin.ts (ADR-010).
export default function VisaoGeral() {
  return ADMIN_REAL ? <VisaoGeralReal /> : <VisaoGeralExemplo />;
}

function SemDados({ title, texto }: { title: string; texto: string }) {
  return (
    <div className="rounded-2xl border border-deepgreen/10 bg-white p-5">
      <p className="text-sm font-medium text-deepgreen">{title}</p>
      <p className="mt-4 text-sm text-deepgreen/75">{texto}</p>
    </div>
  );
}

function VisaoGeralReal() {
  const { carregando, erro, dados, recarregar } = useCarregamento(
    obterVisaoGeralAdmin,
    "Não foi possível carregar as métricas.",
  );

  if (carregando) {
    return (
      <div>
        <AdminPageHeader title="Visão Geral" />
        <p className="text-sm text-deepgreen" role="status">
          Carregando métricas...
        </p>
      </div>
    );
  }
  if (erro || !dados) {
    return (
      <div>
        <AdminPageHeader title="Visão Geral" />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700" role="alert">
          <p>{erro ?? "Não foi possível carregar as métricas."}</p>
          <button type="button" onClick={recarregar} className="mt-3 font-semibold underline">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="Visão Geral" subtitle="Números da plataforma, direto do back-end." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {dados.metricas.map((metrica) => (
          <MetricCard key={metrica.label} {...metrica} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GaugeCard title="Avaliação das reuniões" percentual={dados.avaliacao.percentual} legenda={dados.avaliacao.legenda} />
        {dados.reunioesPorStatus.length > 0 ? (
          <DonutCard title="Reuniões por status" dados={dados.reunioesPorStatus} />
        ) : (
          <SemDados title="Reuniões por status" texto="Nenhuma reunião marcada ainda." />
        )}
        {dados.scoresPorClassificacao.length > 0 ? (
          <RegionCard title="Scores por classificação" dados={dados.scoresPorClassificacao} />
        ) : (
          <SemDados title="Scores por classificação" texto="Nenhum score calculado ainda." />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HighlightCard variant="dark" title="Cadastros na plataforma">
          <p className="mt-2 text-4xl font-bold">{dados.totalStartups + dados.totalInvestidores}</p>
          <p className="mt-2 text-sm">
            {dados.totalStartups} startups e {dados.totalInvestidores} investidores com perfil criado
          </p>
        </HighlightCard>

        <HighlightCard variant="light" title="Moderação de cadastros">
          <p className="mt-2 text-sm text-deepgreen">
            Aprovar e rejeitar cadastros ainda não ficam salvos: o back-end não tem endpoint de moderação.
          </p>
          <Link
            to="/admin/cadastros"
            className="mt-4 inline-block rounded-full border-2 border-deepgreen px-5 py-2 text-sm font-semibold text-deepgreen transition-colors hover:bg-deepgreen hover:text-white"
          >
            Ver tela de exemplo
          </Link>
        </HighlightCard>
      </div>
    </div>
  );
}

function VisaoGeralExemplo() {
  return (
    <div>
      <AdminPageHeader
        title="Visão Geral"
        actionLabel="Exportar relatório"
        onAction={() => console.log("Exportação simulada (sem back-end).")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {METRICAS.map((metrica) => (
          <MetricCard key={metrica.label} {...metrica} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GaugeCard title="Taxa de Aprovação" percentual={TAXA_APROVACAO} legenda="aprovados" />
        <DonutCard title="Distribuição por Segmento" dados={DISTRIBUICAO_SEGMENTO} />
        <RegionCard title="Cadastros por Região" dados={CADASTROS_POR_REGIAO} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HighlightCard variant="dark" title="Cadastros pendentes de revisão">
          <p className="mt-2 text-4xl font-bold">{CADASTROS_PENDENTES}</p>
          <Link
            to="/admin/cadastros"
            className="mt-4 inline-block rounded-full border-2 border-white px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-deepgreen"
          >
            Ver todos
          </Link>
        </HighlightCard>

        <HighlightCard variant="light" title="Ecossistema Porto Digital">
          <p className="mt-2 text-lg font-semibold text-deepgreen">
            {STARTUPS_ATIVAS} startups ativas na plataforma
          </p>
          <div className="mt-4 flex items-center">
            <div className="flex -space-x-3">
              {AVATARES_ATIVOS.map((iniciais) => (
                <span
                  key={iniciais}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-lightgray bg-deepgreen text-xs font-bold text-white"
                >
                  {iniciais}
                </span>
              ))}
            </div>
            <span className="ml-3 text-sm text-deepgreen">
              +{STARTUPS_ATIVAS - AVATARES_ATIVOS.length} outras
            </span>
          </div>
        </HighlightCard>
      </div>
    </div>
  );
}
