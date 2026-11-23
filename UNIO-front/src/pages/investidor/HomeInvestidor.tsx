import { useCallback, useId, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SearchX, WandSparkles } from "lucide-react";
import AgenteRecommendationPanel from "../../components/discovery/AgenteRecommendationPanel";
import AvisoEstado from "../../components/discovery/AvisoEstado";
import BarraDescoberta from "../../components/discovery/BarraDescoberta";
import ConviteFaixa from "../../components/discovery/ConviteFaixa";
import FilterChips from "../../components/discovery/FilterChips";
import GradeRecomendacoes, { POR_PAGINA } from "../../components/discovery/GradeRecomendacoes";
import SaudacaoDescoberta from "../../components/discovery/SaudacaoDescoberta";
import StartupCard from "../../components/discovery/StartupCard";
import { FOCO_VISIVEL } from "../../components/onboarding/selecao";
import SuccessMessage from "../../components/ui/SuccessMessage";
import { useAuth } from "../../contexts/AuthContext";
import { ESTAGIOS, SEGMENTOS } from "../../data/options";
import { alterarItem, useCarregamento, useUserKey } from "../../hooks/useDescoberta";
import { useAcoesRecomendacao } from "../../hooks/useRecomendacoes";
import { aplicarFiltros, listarStartupsRecomendadas, obterTeseInvestidor } from "../../services/discoveryService";
import type { Estagio, Segmento } from "../../types";
import type { TeseInvestidor } from "../../types/discovery";
import { juntarComE } from "../../utils/formatoDescoberta";
import { primeiroNome } from "../../utils/nomeUsuario";

const BOTAO_CLARO = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-lightgray bg-white px-4 text-sm font-semibold text-deepgreen transition hover:border-sage ${FOCO_VISIVEL}`;

function textoTicket(tese: TeseInvestidor) {
  if (tese.apenasMentor) return "Só mentoria";
  return tese.ticketMedio ?? "Não informado";
}

// Tela "Descobrir": home do investidor com as startups recomendadas
export default function HomeInvestidor() {
  const { user } = useAuth();
  const userKey = useUserKey();
  const location = useLocation();
  const cadastroSucesso = (location.state as { cadastroSucesso?: boolean } | null)?.cadastroSucesso;
  const idChips = useId();

  const carregar = useCallback(async () => {
    const [startups, tese] = await Promise.all([listarStartupsRecomendadas(userKey), obterTeseInvestidor()]);
    return { startups, tese };
  }, [userKey]);
  const { carregando, erro, dados, recarregar, alterarDados } = useCarregamento(
    carregar,
    "Não foi possível carregar as recomendações.",
  );

  const aoAlterar = useCallback(
    (id: string, alteracao: Parameters<typeof alterarItem>[2]) =>
      alterarDados((atual) => ({ ...atual, startups: alterarItem(atual.startups, id, alteracao) })),
    [alterarDados],
  );
  const { alternarSalvo, demonstrarInteresse, desfazer, estaOcupado } = useAcoesRecomendacao(aoAlterar);

  const [busca, setBusca] = useState("");
  const [segmento, setSegmento] = useState<Segmento | null>(null);
  const [estagio, setEstagio] = useState<Estagio | null>(null);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(true);

  const startups = useMemo(() => dados?.startups ?? [], [dados]);
  const filtradas = useMemo(
    () => aplicarFiltros(startups, { busca, segmento, estagio }),
    [busca, estagio, segmento, startups],
  );
  const visiveis = filtradas.slice(0, limite);
  // A lista já vem ordenada pelo match: a primeira é o melhor match geral
  const idMelhorMatch = startups[0]?.startup.id;

  // Chips a partir das listas de options.ts, só com o que existe na lista
  const segmentosChips = SEGMENTOS.filter(
    (s) => s !== "Outro" && startups.some(({ startup }) => startup.segmento === s),
  );
  const estagiosChips = ESTAGIOS.filter((e) => startups.some(({ startup }) => startup.estagio === e));
  const filtrosAtivos = Number(Boolean(segmento)) + Number(Boolean(estagio));

  // Mudou o filtro: volta para a primeira "página"
  function filtrar(acao: () => void) {
    acao();
    setLimite(POR_PAGINA);
  }
  const limparFiltros = () =>
    filtrar(() => {
      setBusca("");
      setSegmento(null);
      setEstagio(null);
    });

  return (
    <div>
      {cadastroSucesso && <SuccessMessage message="Cadastro realizado com sucesso! Bem-vindo(a) à UNIO." />}

      <AgenteRecommendationPanel candidateLabel="Startups" />

      <BarraDescoberta
        busca={busca}
        onBusca={(valor) => filtrar(() => setBusca(valor))}
        placeholder="Buscar por nome, setor ou tese…"
        rotuloBusca="Buscar startups"
        filtrosVisiveis={filtrosVisiveis}
        onAlternarFiltros={() => setFiltrosVisiveis((v) => !v)}
        idFiltros={idChips}
        filtrosAtivos={filtrosAtivos}
      />

      <SaudacaoDescoberta
        nome={primeiroNome(user)}
        carregando={carregando || !dados}
        resumo={`${startups.length} ${
          startups.length === 1 ? "startup nova combina" : "startups novas combinam"
        } com o seu perfil`}
        criterios={
          dados && dados.tese.segmentosInteresse.length > 0
            ? juntarComE(dados.tese.segmentosInteresse)
            : "tese ainda não configurada"
        }
        cartoes={[{ rotulo: "Seu ticket médio", valor: dados ? textoTicket(dados.tese) : "" }]}
      />

      {filtrosVisiveis && dados && (
        <div className="mt-6">
          <FilterChips
            id={idChips}
            grupos={[
              {
                opcoes: segmentosChips,
                selecionado: segmento,
                onSelecionar: (valor) => filtrar(() => setSegmento(valor as Segmento | null)),
              },
              {
                opcoes: estagiosChips,
                selecionado: estagio,
                onSelecionar: (valor) => filtrar(() => setEstagio(valor as Estagio | null)),
              },
            ]}
            onTodos={() =>
              filtrar(() => {
                setSegmento(null);
                setEstagio(null);
              })
            }
          />
        </div>
      )}

      <GradeRecomendacoes
        titulo="Startups para você"
        selo="Recomendadas pelo algoritmo de tese"
        carregando={carregando}
        erro={erro}
        tituloErro="Não foi possível carregar as recomendações"
        onTentarNovamente={recarregar}
        total={startups.length}
        totalFiltrado={filtradas.length}
        onVerMais={() => setLimite((l) => l + POR_PAGINA)}
        cards={visiveis.map((item) => ({
          chave: item.startup.id,
          card: (
            <StartupCard
              item={item}
              melhorMatch={item.startup.id === idMelhorMatch}
              ocupado={estaOcupado(item.startup.id)}
              onSalvar={() => alternarSalvo({ perfil: "investidor", item })}
              onInteresse={() => demonstrarInteresse({ perfil: "investidor", item })}
              onDesfazer={() => desfazer({ perfil: "investidor", item })}
            />
          ),
        }))}
        vazio={
          <AvisoEstado
            icone={SearchX}
            titulo="Ainda não há startups cadastradas"
            texto="Quando startups criarem o perfil, elas aparecem aqui com o score de compatibilidade."
            acao={
              <Link to="/onboarding/investidor?passo=1" className={BOTAO_CLARO}>
                Configurar Tese
              </Link>
            }
          />
        }
        semResultado={
          <AvisoEstado
            icone={SearchX}
            titulo="Nenhuma startup combina com esses filtros"
            texto="Tente outra busca ou remova algum filtro."
            acao={
              <button type="button" onClick={limparFiltros} className={BOTAO_CLARO}>
                Limpar filtros
              </button>
            }
          />
        }
      />

      <ConviteFaixa
        icone={WandSparkles}
        titulo="Aprimore sua tese para receber recomendações mais precisas"
        texto="Revise segmentos, estágios, ticket e região a qualquer momento. As recomendações se ajustam na hora."
        acao={{ para: "/onboarding/investidor?passo=1", rotulo: "Configurar Tese" }}
      />
    </div>
  );
}
