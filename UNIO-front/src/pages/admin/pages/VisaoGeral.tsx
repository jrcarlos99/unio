import { Link } from "react-router-dom";
import AdminPageHeader from "../components/AdminPageHeader";
import MetricCard from "../components/MetricCard";
import GaugeCard from "../components/GaugeCard";
import DonutCard from "../components/DonutCard";
import RegionCard from "../components/RegionCard";
import HighlightCard from "../components/HighlightCard";
import { useCarregamento } from "../../../hooks/useDescoberta";
import { obterVisaoGeralAdmin } from "../../../services/adminService";

// Dashboard de métricas: 3 cards de número no topo, 3 cards de gráfico no
// meio e 2 cards de destaque embaixo. Tudo de GET /api/admin/metrics
// (ADR-010 e ADR-011).

function SemDados({ title, texto }: { title: string; texto: string }) {
  return (
    <div className="rounded-2xl border border-deepgreen/10 bg-white p-5">
      <p className="text-sm font-medium text-deepgreen">{title}</p>
      <p className="mt-4 text-sm text-deepgreen/75">{texto}</p>
    </div>
  );
}

export default function VisaoGeral() {
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

        <HighlightCard variant="light" title="Cadastros">
          <p className="mt-2 text-sm text-deepgreen">
            Lista das contas da plataforma. Aprovar e rejeitar ainda não estão disponíveis: o back-end não tem endpoint
            de moderação.
          </p>
          <Link
            to="/admin/cadastros"
            className="mt-4 inline-block rounded-full border-2 border-deepgreen px-5 py-2 text-sm font-semibold text-deepgreen transition-colors hover:bg-deepgreen hover:text-white"
          >
            Ver cadastros
          </Link>
        </HighlightCard>
      </div>
    </div>
  );
}

