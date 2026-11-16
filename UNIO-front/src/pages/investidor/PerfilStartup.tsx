import { useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  BadgeCheck,
  ChartPie,
  CircleAlert,
  Info,
  Lightbulb,
  MapPin,
  SearchX,
  Sparkles,
  Table2,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import AvisoEstado from "../../components/discovery/AvisoEstado";
import EsqueletoPerfil from "../../components/discovery/EsqueletoPerfil";
import FaixaStatusInteresse from "../../components/discovery/FaixaStatusInteresse";
import LinkVoltar from "../../components/discovery/LinkVoltar";
import CapitalCard from "../../components/discovery/CapitalCard";
import CompatibilidadeCard from "../../components/discovery/CompatibilidadeCard";
import InteresseButton from "../../components/discovery/InteresseButton";
import PitchCanvasCard from "../../components/discovery/PitchCanvasCard";
import SalvarButton from "../../components/discovery/SalvarButton";
import SecaoPerfil from "../../components/discovery/SecaoPerfil";
import StartupLogo from "../../components/discovery/StartupLogo";
import WhyList from "../../components/discovery/WhyList";
import { FOCO_VISIVEL } from "../../components/onboarding/selecao";
import SeloPopularidade from "../../components/popularidade/SeloPopularidade";
import { useRegistrarVisita } from "../../hooks/useAvaliacoes";
import { useSessaoReunioes } from "../../hooks/useReunioes";
import { useCarregamento, useUserKey } from "../../hooks/useDescoberta";
import { useAcoesRecomendacao } from "../../hooks/useRecomendacoes";
import { obterStartup } from "../../services/discoveryService";
import type { AlteracaoRecomendacao } from "../../types/recomendacoes";

// Pílulas do cabeçalho; a cor do texto fica em cada uso para não conflitar
const PILULA = "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs";
const CHIP = `${PILULA} font-medium text-deepgreen`;

// Tela "Perfil da startup" vista pelo investidor (/startups/:id)
export default function PerfilStartup() {
  const { id = "" } = useParams();
  // Uma visita por abertura, sem mostrar quem visitou (RF10, ADR-006)
  useRegistrarVisita(useSessaoReunioes(), id);
  const userKey = useUserKey();

  const carregar = useCallback(() => obterStartup(userKey, id), [id, userKey]);
  const { carregando, erro, dados: detalhe, recarregar, alterarDados } = useCarregamento(
    carregar,
    "Não foi possível carregar o perfil da startup.",
  );

  const aoAlterar = useCallback(
    (_id: string, alteracao: AlteracaoRecomendacao) =>
      alterarDados((atual) => (atual ? { ...atual, ...alteracao } : atual)),
    [alterarDados],
  );
  const { alternarSalvo, demonstrarInteresse, desfazer, estaOcupado } = useAcoesRecomendacao(aoAlterar);

  if (carregando) {
    return (
      <div>
        <div className="mb-6">
          <LinkVoltar para="/home-investidor" rotulo="Voltar para Startups recomendadas" />
        </div>
        <EsqueletoPerfil rotulo="Carregando perfil da startup" />
      </div>
    );
  }

  if (erro) {
    return (
      <div>
        <div className="mb-6">
          <LinkVoltar para="/home-investidor" rotulo="Voltar para Startups recomendadas" />
        </div>
        <AvisoEstado
          erro
          icone={CircleAlert}
          titulo="Não foi possível carregar o perfil"
          texto={erro}
          acao={
            <button
              type="button"
              onClick={recarregar}
              className={`min-h-[48px] rounded-2xl border border-lightgray bg-white px-5 text-sm font-semibold text-deepgreen hover:border-sage ${FOCO_VISIVEL}`}
            >
              Tentar novamente
            </button>
          }
        />
      </div>
    );
  }

  if (!detalhe) {
    return (
      <AvisoEstado
        icone={SearchX}
        titulo="Startup não encontrada"
        texto="Ela pode ter saído da plataforma ou o link está incorreto."
        acao={<LinkVoltar para="/home-investidor" rotulo="Voltar para Startups recomendadas" />}
      />
    );
  }

  const { startup, compatibilidade, statusInteresse, salvo, motivos } = detalhe;
  const rec = { perfil: "investidor" as const, item: detalhe };
  const ocupado = estaOcupado(startup.id);

  return (
    <div>
      <div className="mb-6">
        <LinkVoltar para="/home-investidor" rotulo="Voltar para Startups recomendadas" />
      </div>

      <FaixaStatusInteresse id={startup.id} status={statusInteresse} outroLado="a startup" />

      {/* Cabeçalho */}
      <section className="rounded-3xl border border-lightgray bg-white p-5 shadow-soft sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <StartupLogo startup={startup} tamanho="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-deepgreen sm:text-4xl">{startup.nome}</h1>
                <SeloPopularidade percentual={detalhe.popularidade} tamanho="md" />
                {startup.verificada && (
                  <span className={`${PILULA} bg-sage/40 font-semibold text-deepgreen`}>
                    <BadgeCheck size={14} aria-hidden="true" />
                    Verificada
                  </span>
                )}
                {statusInteresse === "match" && (
                  <span className={`${PILULA} bg-deepgreen font-semibold text-white`}>
                    <Sparkles size={14} aria-hidden="true" />
                    Deu match!
                  </span>
                )}
              </div>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Resumo">
                <li className={`${PILULA} border-[1.5px] border-deepgreen bg-sage/20 font-semibold text-deepgreen`}>
                  {startup.segmento}
                </li>
                <li className={`${CHIP} bg-lightgray`}>{startup.estagio}</li>
                <li className={`${CHIP} bg-lightgray`}>
                  <MapPin size={12} aria-hidden="true" />
                  {startup.cidade}, {startup.uf}
                </li>
                <li className={`${CHIP} bg-lightgray`}>Fundada em {startup.fundacao}</li>
              </ul>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:w-auto xl:min-w-[380px]">
            <SalvarButton
              variante="completo"
              salvo={salvo}
              nome={startup.nome}
              onClick={() => alternarSalvo(rec)}
              ocupado={ocupado}
            />
            <InteresseButton
              variante="perfil"
              id={startup.id}
              status={statusInteresse}
              nome={startup.nome}
              onInteresse={() => demonstrarInteresse(rec)}
              onDesfazer={() => desfazer(rec)}
              ocupado={ocupado}
            />
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <SecaoPerfil titulo="Sobre a startup" icone={Info}>
            <p className="leading-relaxed text-deepgreen/90">{startup.descricao}</p>
            <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { rotulo: "Modelo de negócio", valor: startup.modeloNegocio },
                { rotulo: "Mercado-alvo", valor: startup.mercadoAlvo },
                {
                  rotulo: "Tamanho de equipe",
                  valor: `${startup.tamanhoEquipe} ${startup.tamanhoEquipe === 1 ? "colaborador" : "colaboradores"}`,
                },
              ].map(({ rotulo, valor }) => (
                <div key={rotulo} className="rounded-2xl border border-lightgray bg-lightgray/30 p-4">
                  <dt className="text-xs text-deepgreen/75">{rotulo}</dt>
                  <dd className="mt-1 font-bold text-deepgreen">{valor}</dd>
                </div>
              ))}
            </dl>
          </SecaoPerfil>

          <SecaoPerfil
            titulo="Canvas do pitch"
            icone={Table2}
            selo={<span className={`${CHIP} bg-lightgray`}>Dossiê UNIO Audit</span>}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PitchCanvasCard titulo="Problema" icone={TriangleAlert} texto={startup.canvas.problema} />
              <PitchCanvasCard titulo="Solução" icone={Lightbulb} texto={startup.canvas.solucao} />
              <PitchCanvasCard titulo="Mercado" icone={ChartPie} texto={startup.canvas.mercado} />
              <PitchCanvasCard titulo="Tração" icone={TrendingUp} texto={startup.canvas.tracao} />
            </div>
          </SecaoPerfil>

          <CapitalCard captacao={startup.captacao} />
        </div>

        <div className="min-w-0 space-y-6">
          <CompatibilidadeCard compatibilidade={compatibilidade} />
          <WhyList motivos={motivos} />
        </div>
      </div>
    </div>
  );
}
