import { useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  BadgeCheck,
  ChartPie,
  CircleAlert,
  HandHelping,
  Info,
  MapPin,
  SearchX,
  Sparkles,
  Sprout,
  Table2,
  Target,
} from "lucide-react";
import AvatarIniciais from "../../components/discovery/AvatarIniciais";
import AvisoEstado from "../../components/discovery/AvisoEstado";
import CompatibilidadeCard from "../../components/discovery/CompatibilidadeCard";
import EsqueletoPerfil from "../../components/discovery/EsqueletoPerfil";
import FaixaStatusInteresse from "../../components/discovery/FaixaStatusInteresse";
import InteresseButton from "../../components/discovery/InteresseButton";
import LinkVoltar from "../../components/discovery/LinkVoltar";
import PitchCanvasCard from "../../components/discovery/PitchCanvasCard";
import SalvarButton from "../../components/discovery/SalvarButton";
import SecaoPerfil from "../../components/discovery/SecaoPerfil";
import TicketCard from "../../components/discovery/TicketCard";
import WhyList from "../../components/discovery/WhyList";
import { rotuloTipoInvestidor } from "../../components/discovery/rotulos";
import { FOCO_VISIVEL } from "../../components/onboarding/selecao";
import SeloPopularidade from "../../components/popularidade/SeloPopularidade";
import { useRegistrarVisita } from "../../hooks/useAvaliacoes";
import { useSessaoReunioes } from "../../hooks/useReunioes";
import { useAuth } from "../../contexts/AuthContext";
import { useCarregamento } from "../../hooks/useDescoberta";
import { useAcoesRecomendacao } from "../../hooks/useRecomendacoes";
import { obterInvestidor } from "../../services/investidoresService";
import type { AlteracaoRecomendacao } from "../../types/recomendacoes";
import { formatarFaixaTicket } from "../../utils/formatoDescoberta";
import { localDoInvestidor, textoDisponibilidade } from "../../utils/perfilDescoberta";

// Pílulas do cabeçalho; a cor do texto fica em cada uso para não conflitar
const PILULA = "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs";
const CHIP = `${PILULA} font-medium text-deepgreen`;

const VOLTAR = { para: "/investidores", rotulo: "Voltar para Investidores" };

// Tela "Perfil do investidor" vista pela startup (/investidores/:id). Espelho
// do perfil da startup visto pelo investidor.
export default function PerfilInvestidor() {
  const { id = "" } = useParams();
  // Uma visita por abertura, sem mostrar quem visitou (RF10, ADR-006)
  useRegistrarVisita(useSessaoReunioes(), id);
  const { user } = useAuth();

  const carregar = useCallback(() => obterInvestidor(user, id), [id, user]);
  const { carregando, erro, dados: detalhe, recarregar, alterarDados } = useCarregamento(
    carregar,
    "Não foi possível carregar o perfil do investidor.",
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
          <LinkVoltar {...VOLTAR} />
        </div>
        <EsqueletoPerfil rotulo="Carregando perfil do investidor" />
      </div>
    );
  }

  if (erro) {
    return (
      <div>
        <div className="mb-6">
          <LinkVoltar {...VOLTAR} />
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
        titulo="Investidor não encontrado"
        texto="O perfil pode ter saído da plataforma ou o link está incorreto."
        acao={<LinkVoltar {...VOLTAR} />}
      />
    );
  }

  const { investidor, compatibilidade, statusInteresse, salvo, motivos } = detalhe;
  const rec = { perfil: "startup" as const, item: detalhe };
  const ocupado = estaOcupado(investidor.id);
  const soMentora = investidor.ticketMin === null || investidor.ticketMax === null;
  const ticket = soMentora
    ? "Só mentoria"
    : formatarFaixaTicket(investidor.ticketMin as number, investidor.ticketMax as number, " a ");

  return (
    <div>
      <div className="mb-6">
        <LinkVoltar {...VOLTAR} />
      </div>

      <FaixaStatusInteresse id={investidor.id} status={statusInteresse} outroLado="o investidor" />

      {/* Cabeçalho */}
      <section className="rounded-3xl border border-lightgray bg-white p-5 shadow-soft sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <AvatarIniciais nome={investidor.nome} tamanho="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-deepgreen sm:text-4xl">{investidor.nome}</h1>
                <SeloPopularidade percentual={detalhe.popularidade} tamanho="md" />
                {investidor.verificado && (
                  <span className={`${PILULA} bg-sage/40 font-semibold text-deepgreen`}>
                    <BadgeCheck size={14} aria-hidden="true" />
                    Verificado
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
                  {rotuloTipoInvestidor(investidor.tipo)}
                </li>
                {localDoInvestidor(investidor) && (
                  <li className={`${CHIP} bg-lightgray`}>
                    <MapPin size={12} aria-hidden="true" />
                    {localDoInvestidor(investidor)}
                  </li>
                )}
                {investidor.desde !== null && (
                  <li className={`${CHIP} bg-lightgray`}>
                    {soMentora ? "Mentoria desde" : "Investe desde"} {investidor.desde}
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:w-auto xl:min-w-[380px]">
            <SalvarButton
              variante="completo"
              salvo={salvo}
              nome={investidor.nome}
              rotulos={{ salvar: "Salvar investidor", salvo: "Investidor salvo" }}
              onClick={() => alternarSalvo(rec)}
              ocupado={ocupado}
            />
            <InteresseButton
              variante="perfil"
              id={investidor.id}
              status={statusInteresse}
              nome={investidor.nome}
              aguardando="Aguardando o investidor"
              onInteresse={() => demonstrarInteresse(rec)}
              onDesfazer={() => desfazer(rec)}
              ocupado={ocupado}
            />
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <SecaoPerfil titulo="Sobre o investidor" icone={Info}>
            {(investidor.bio || investidor.tese) && (
              <p className="mb-5 leading-relaxed text-deepgreen/90">{investidor.bio || investidor.tese}</p>
            )}
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { rotulo: "Tese principal", valor: investidor.tesePrincipal },
                { rotulo: "Ticket médio", valor: ticket },
                { rotulo: "Disponibilidade", valor: textoDisponibilidade(investidor.disponibilidade) },
              ]
                .filter(({ valor }) => valor)
                .map(({ rotulo, valor }) => (
                <div key={rotulo} className="rounded-2xl border border-lightgray bg-lightgray/30 p-4">
                  <dt className="text-xs text-deepgreen/75">{rotulo}</dt>
                  <dd className="mt-1 font-bold text-deepgreen">{valor}</dd>
                </div>
              ))}
            </dl>
          </SecaoPerfil>

          <SecaoPerfil
            titulo="Tese de investimento"
            icone={Table2}
            selo={<span className={`${CHIP} bg-lightgray`}>Perfil UNIO</span>}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PitchCanvasCard
                titulo="Segmentos de interesse"
                icone={ChartPie}
                texto={investidor.segmentosInteresse.join(", ")}
              />
              <PitchCanvasCard
                titulo="Estágios preferidos"
                icone={Sprout}
                texto={investidor.estagiosInteresse.join(", ")}
              />
              {/* Só nos dados de exemplo: o back não tem esses campos (ADR-008) */}
              {investidor.buscaEmStartups.length > 0 && (
                <PitchCanvasCard
                  titulo="O que busca em startups"
                  icone={Target}
                  texto={investidor.buscaEmStartups.join(", ")}
                />
              )}
              {investidor.comoApoia.length > 0 && (
                <PitchCanvasCard titulo="Como apoia" icone={HandHelping} texto={investidor.comoApoia.join(", ")} />
              )}
              {investidor.regiaoTexto && (
                <PitchCanvasCard titulo="Região de interesse" icone={MapPin} texto={investidor.regiaoTexto} />
              )}
            </div>
          </SecaoPerfil>

          <TicketCard investidor={investidor} />
        </div>

        <div className="min-w-0 space-y-6">
          <CompatibilidadeCard compatibilidade={compatibilidade} />
          <WhyList motivos={motivos} titulo="Por que você viu este investidor" />
        </div>
      </div>
    </div>
  );
}
