import { useCallback, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  CircleAlert,
  CircleCheck,
  Clock,
  Eye,
  FilePlus2,
  Handshake,
  LineChart,
  Search,
  SearchX,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import InterestFunnel from "../../components/dashboard/InterestFunnel";
import MetricCard from "../../components/dashboard/MetricCard";
import PainelCard from "../../components/dashboard/PainelCard";
import ProfileCompleteness from "../../components/dashboard/ProfileCompleteness";
import RecommendedInvestorCard from "../../components/dashboard/RecommendedInvestorCard";
import ViewsChart from "../../components/dashboard/ViewsChart";
import CardPopularidade from "../../components/popularidade/CardPopularidade";
import AvisoEstado from "../../components/discovery/AvisoEstado";
import SinoNotificacoes from "../../components/layout/SinoNotificacoes";
import { FOCO_VISIVEL } from "../../components/onboarding/selecao";
import SuccessMessage from "../../components/ui/SuccessMessage";
import { useAuth } from "../../contexts/AuthContext";
import { usePopularidade } from "../../hooks/useAvaliacoes";
import { useCarregamento } from "../../hooks/useDescoberta";
import { useSessaoReunioes } from "../../hooks/useReunioes";
import { useToast } from "../../hooks/useToast";
import { obterContextoStartup, obterResumo } from "../../services/dashboardStartupService";
import { contarInteressesRecebidos } from "../../services/interessesRecebidosService";
import { aplicarFiltrosInvestidores, listarInvestidoresRecomendados } from "../../services/investidoresService";

const QTD_RECOMENDADOS = 3;

const BOTAO_ICONE = `relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-deepgreen transition hover:bg-lightgray ${FOCO_VISIVEL}`;
const BOTAO_CLARO = `inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-lightgray bg-white px-5 text-sm font-semibold text-deepgreen hover:border-sage ${FOCO_VISIVEL}`;
const SELO = "inline-flex items-center gap-1 rounded-full bg-sage/30 px-2 py-0.5 font-semibold text-deepgreen";

// Grid dos 4 cards de métrica: 2 colunas e os 4 lado a lado no xl
const GRID_METRICAS = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4";
const INDISPONIVEL = "—";

// Número do back ou "—" quando a chamada daquele bloco falhou
function valorOuTraco(valor: number | null) {
  return valor === null ? INDISPONIVEL : valor;
}

function Esqueleto() {
  const bloco = "animate-pulse rounded-3xl bg-lightgray";
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando visão geral</span>
      <div className={GRID_METRICAS}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`h-44 ${bloco}`} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`h-96 ${bloco}`} />
        ))}
      </div>
    </div>
  );
}

// Home da startup ("Visão geral"). Todos os dados vêm do back, pelo
// dashboardStartupService e pelo investidoresService: visualizações, gráfico,
// interessados, matches, reuniões, popularidade e os investidores
// recomendados (top 3 por score). O bloco cuja chamada falhar mostra
// "indisponível"; não existe número de exemplo (ADR-011).
export default function VisaoGeral() {
  const { user } = useAuth();
  const { mostrar } = useToast();
  const location = useLocation();
  const cadastroSucesso = (location.state as { cadastroSucesso?: boolean } | null)?.cadastroSucesso;
  const [busca, setBusca] = useState("");
  const sessao = useSessaoReunioes();
  const popularidade = usePopularidade(sessao);

  const carregar = useCallback(async () => {
    const [resumo, contexto, investidores, aguardandoResposta] = await Promise.all([
      obterResumo(user),
      obterContextoStartup(user),
      listarInvestidoresRecomendados(user),
      // Interesses recebidos ainda não retribuídos (ADR-015); falha sozinha
      contarInteressesRecebidos().catch(() => null),
    ]);
    return { resumo, contexto, investidores, aguardandoResposta };
  }, [user]);
  const { carregando, erro, dados, recarregar } = useCarregamento(carregar, "Não foi possível carregar a visão geral.");

  const filtrados = useMemo(() => aplicarFiltrosInvestidores(dados?.investidores ?? [], { busca }), [busca, dados]);

  const emBreve = (recurso: string) => mostrar(`${recurso} chega em breve.`, "info");

  let conteudo;
  if (carregando) {
    conteudo = <Esqueleto />;
  } else if (erro || !dados) {
    conteudo = (
      <AvisoEstado
        erro
        icone={CircleAlert}
        titulo="Não foi possível carregar a visão geral"
        texto={erro ?? undefined}
        acao={
          <button type="button" onClick={recarregar} className={BOTAO_CLARO}>
            Tentar novamente
          </button>
        }
      />
    );
  } else {
    const { resumo, contexto, investidores, aguardandoResposta } = dados;
    const { metricas } = resumo;
    const variacao = metricas.variacaoVisualizacoes;
    const IconeVariacao = variacao !== null && variacao < 0 ? TrendingDown : TrendingUp;
    const sinalVariacao = variacao !== null && variacao > 0 ? "+" : "";
    const semanas = resumo.visualizacoesSemanais;
    const totalSemanas = semanas ? semanas.reduce((soma, p) => soma + p.atual, 0) : 0;
    const mediaDiaria = semanas && semanas.length > 0 ? totalSemanas / (semanas.length * 7) : 0;
    const segmento = contexto.dados.segmento ?? "o seu segmento";

    conteudo = (
      <>
        <div className={GRID_METRICAS}>
          <MetricCard
            rotulo="Visualizações do perfil"
            valor={valorOuTraco(metricas.visualizacoes)}
            icone={Eye}
            rodape={
              variacao === null ? (
                "Indisponível no momento"
              ) : (
                <>
                  <span className={SELO}>
                    <IconeVariacao size={12} aria-hidden="true" />
                    {sinalVariacao}
                    {variacao}%
                  </span>
                  últimos 28 dias, vs 28 dias anteriores
                </>
              )
            }
          />
          <MetricCard
            rotulo="Investidores interessados"
            valor={valorOuTraco(metricas.interessados)}
            icone={Bookmark}
            rodape={
              metricas.interessados === null
                ? "Indisponível no momento"
                : aguardandoResposta
                  ? `demonstraram interesse em você, ${aguardandoResposta} ${
                      aguardandoResposta === 1 ? "aguarda" : "aguardam"
                    } sua resposta`
                  : "demonstraram interesse em você"
            }
          />
          <MetricCard
            rotulo="Matches"
            valor={valorOuTraco(metricas.matches)}
            icone={Handshake}
            rodape={
              metricas.matches === null ? (
                "Indisponível no momento"
              ) : (
                <>
                  <span className={SELO}>
                    <CircleCheck size={12} aria-hidden="true" />
                    Interesse mútuo
                  </span>
                  com investidores
                </>
              )
            }
          />
          <CardPopularidade
            {...popularidade}
            apoio="Quanto maior a popularidade, mais perfis você aparece para recomendados."
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {semanas && semanas.length > 0 ? (
            <ViewsChart semanas={semanas} mediaDiaria={mediaDiaria} />
          ) : (
            <PainelCard titulo="Evolução das visualizações">
              <AvisoEstado
                icone={LineChart}
                titulo={semanas === null ? "Gráfico indisponível no momento" : "Ainda sem visualizações"}
                texto={
                  semanas === null
                    ? "Não foi possível carregar as visualizações. Tente atualizar a página."
                    : "Quando investidores abrirem o seu perfil, a evolução aparece aqui."
                }
              />
            </PainelCard>
          )}
          <ProfileCompleteness completude={contexto.completude} para="/meu-perfil" />
          <InterestFunnel etapas={resumo.funil} />

          <PainelCard
            titulo="Investidores recomendados"
            subtitulo={`Anjos com alta afinidade com ${segmento} e sua faixa de captação`}
            extra={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {/* Os três com maior score do back (/api/discovery/investors) */}
                <Link
                  to="/investidores"
                  className={`inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-deepgreen hover:underline ${FOCO_VISIVEL}`}
                >
                  Ver todos ({investidores.length})
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            }
          >
            {busca && (
              <p className="mb-3 text-xs text-deepgreen/75" aria-live="polite">
                {filtrados.length} {filtrados.length === 1 ? "investidor combina" : "investidores combinam"} com “{busca}”
              </p>
            )}
            {filtrados.length === 0 ? (
              <AvisoEstado
                icone={SearchX}
                titulo="Nenhum investidor combina com a busca"
                texto="Tente outro nome, segmento ou tese."
                acao={
                  <button type="button" onClick={() => setBusca("")} className={BOTAO_CLARO}>
                    Limpar busca
                  </button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {filtrados.slice(0, QTD_RECOMENDADOS).map((item) => (
                  <li key={item.investidor.id}>
                    <RecommendedInvestorCard item={item} />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-lightgray pt-4 text-xs">
              <p className="text-deepgreen/75">Base de investidores atualizada diariamente</p>
              <Link
                to="/onboarding/startup?passo=2"
                className={`rounded font-semibold text-deepgreen hover:underline ${FOCO_VISIVEL}`}
              >
                Configurar preferências de tese
              </Link>
            </div>
          </PainelCard>
        </div>
      </>
    );
  }

  const hora = dados
    ? new Date(dados.resumo.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div>
      {cadastroSucesso && <SuccessMessage message="Cadastro realizado com sucesso! Bem-vindo(a) à UNIO." />}

      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-3 border-b border-lightgray pb-5">
        <label className="relative min-w-0 basis-full sm:max-w-sm sm:flex-1 sm:basis-auto">
          <span className="sr-only">Buscar investidores recomendados</span>
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-deepgreen/75"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar investidores, teses…"
            className="min-h-[48px] w-full rounded-2xl border border-lightgray bg-white pl-11 pr-4 text-sm text-deepgreen placeholder:text-deepgreen/60 focus:border-deepgreen focus:outline-none focus:ring-2 focus:ring-deepgreen/20"
          />
        </label>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => emBreve("O novo pitch deck")}
            className={`inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-deepgreen px-4 text-sm font-semibold text-white transition hover:bg-sage hover:text-deepgreen sm:px-5 ${FOCO_VISIVEL}`}
          >
            <FilePlus2 size={18} aria-hidden="true" />
            Novo Pitch Deck
          </button>
          <span className="mx-1 hidden h-8 w-px bg-lightgray sm:block" aria-hidden="true" />
          <button type="button" onClick={() => emBreve("Os filtros")} aria-label="Filtros" className={BOTAO_ICONE}>
            <SlidersHorizontal size={20} aria-hidden="true" />
          </button>
          <SinoNotificacoes className={BOTAO_ICONE} />
        </div>
      </div>

      {/* Título */}
      <div className="mb-6 mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-deepgreen sm:text-4xl">Visão geral</h1>
          <p className="mt-2 max-w-xl text-deepgreen/80">
            Acompanhe o engajamento e visibilidade da sua startup com investidores qualificados.
          </p>
        </div>
        {hora && (
          <p className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-lightgray px-4 py-2 text-sm text-deepgreen">
            <Clock size={16} aria-hidden="true" />
            Atualizado hoje às {hora}
          </p>
        )}
      </div>

      {conteudo}
    </div>
  );
}
