import { useCallback, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, SearchX } from "lucide-react";
import AvisoEstado from "../../components/discovery/AvisoEstado";
import BarraDescoberta from "../../components/discovery/BarraDescoberta";
import ConviteFaixa from "../../components/discovery/ConviteFaixa";
import FilterChips from "../../components/discovery/FilterChips";
import GradeRecomendacoes, { POR_PAGINA } from "../../components/discovery/GradeRecomendacoes";
import InvestorCard from "../../components/discovery/InvestorCard";
import SaudacaoDescoberta from "../../components/discovery/SaudacaoDescoberta";
import { FOCO_VISIVEL } from "../../components/onboarding/selecao";
import { useAuth } from "../../contexts/AuthContext";
import { SEGMENTOS_DETALHADOS, TIPOS_PERFIL } from "../../data/options";
import { useCarregamento } from "../../hooks/useDescoberta";
import { useAcoesRecomendacao } from "../../hooks/useRecomendacoes";
import {
  aplicarFiltrosInvestidores,
  listarInvestidoresRecomendados,
  obterResumoStartup,
} from "../../services/investidoresService";
import type { Segmento } from "../../types";
import type { FiltrosInvestidores, InvestidorRecomendado } from "../../types/investidores";
import type { AlteracaoRecomendacao } from "../../types/recomendacoes";
import { juntarComE } from "../../utils/formatoDescoberta";
import { primeiroNome } from "../../utils/nomeUsuario";

// Quantos segmentos aparecem nos chips (os mais frequentes entre os investidores)
const MAX_SEGMENTOS_CHIPS = 5;

const BOTAO_CLARO = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-lightgray bg-white px-4 text-sm font-semibold text-deepgreen transition hover:border-sage ${FOCO_VISIVEL}`;

type TipoFiltro = NonNullable<FiltrosInvestidores["tipo"]>;
const TIPOS_CHIPS = TIPOS_PERFIL.filter((tipo): tipo is TipoFiltro => tipo !== "Ambos");

// Segmentos de interesse mais frequentes entre os investidores da lista, na
// ordem de options.ts quando empatam
function segmentosMaisFrequentes(lista: InvestidorRecomendado[]): Segmento[] {
  const contagem = new Map<Segmento, number>();
  for (const { investidor } of lista) {
    for (const segmento of investidor.segmentosInteresse) {
      contagem.set(segmento, (contagem.get(segmento) ?? 0) + 1);
    }
  }
  return SEGMENTOS_DETALHADOS.map((opcao) => opcao.valor)
    .filter((segmento) => contagem.has(segmento))
    .sort((a, b) => (contagem.get(b) ?? 0) - (contagem.get(a) ?? 0))
    .slice(0, MAX_SEGMENTOS_CHIPS);
}

// Aba "Investidores" da startup: espelho do "Descobrir" do investidor, com
// investidores e mentores recomendados para a startup
export default function Investidores() {
  const { user } = useAuth();
  const idChips = useId();

  const carregar = useCallback(async () => {
    const [investidores, resumo] = await Promise.all([listarInvestidoresRecomendados(user), obterResumoStartup(user)]);
    return { investidores, resumo };
  }, [user]);
  const { carregando, erro, dados, recarregar, alterarDados } = useCarregamento(
    carregar,
    "Não foi possível carregar os investidores recomendados.",
  );

  const aoAlterar = useCallback(
    (id: string, alteracao: AlteracaoRecomendacao) =>
      alterarDados((atual) => ({
        ...atual,
        investidores: atual.investidores.map((item) => (item.investidor.id === id ? { ...item, ...alteracao } : item)),
      })),
    [alterarDados],
  );
  const { alternarSalvo, demonstrarInteresse, desfazer, estaOcupado } = useAcoesRecomendacao(aoAlterar);

  const [busca, setBusca] = useState("");
  const [segmento, setSegmento] = useState<Segmento | null>(null);
  const [tipo, setTipo] = useState<TipoFiltro | null>(null);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(true);

  const investidores = useMemo(() => dados?.investidores ?? [], [dados]);
  const filtrados = useMemo(
    () => aplicarFiltrosInvestidores(investidores, { busca, segmento, tipo }),
    [busca, investidores, segmento, tipo],
  );
  const visiveis = filtrados.slice(0, limite);
  // A lista já vem ordenada pelo match: o primeiro é o melhor match geral
  const idMelhorMatch = investidores[0]?.investidor.id;
  const filtrosAtivos = Number(Boolean(segmento)) + Number(Boolean(tipo));

  // Mudou o filtro: volta para a primeira "página"
  function filtrar(acao: () => void) {
    acao();
    setLimite(POR_PAGINA);
  }
  const limparFiltros = () =>
    filtrar(() => {
      setBusca("");
      setSegmento(null);
      setTipo(null);
    });

  const resumo = dados?.resumo;
  const criterios = resumo
    ? [resumo.segmento, resumo.estagio, resumo.capitalProcurado].filter((item): item is string => Boolean(item))
    : [];

  return (
    <div>
      <BarraDescoberta
        busca={busca}
        onBusca={(valor) => filtrar(() => setBusca(valor))}
        placeholder="Buscar por nome, segmento ou tese…"
        rotuloBusca="Buscar investidores"
        filtrosVisiveis={filtrosVisiveis}
        onAlternarFiltros={() => setFiltrosVisiveis((v) => !v)}
        idFiltros={idChips}
        filtrosAtivos={filtrosAtivos}
      />

      <SaudacaoDescoberta
        nome={primeiroNome(user)}
        carregando={carregando || !dados}
        resumo={`${investidores.length} ${
          investidores.length === 1 ? "investidor combina" : "investidores combinam"
        } com a sua startup`}
        criterios={criterios.length > 0 ? juntarComE(criterios) : "complete o perfil da startup"}
        cartoes={[
          { rotulo: "Capital procurado", valor: resumo?.capitalProcurado ?? "Não informado" },
        ]}
      />

      {filtrosVisiveis && dados && (
        <div className="mt-6">
          <FilterChips
            id={idChips}
            grupos={[
              {
                opcoes: segmentosMaisFrequentes(investidores),
                selecionado: segmento,
                onSelecionar: (valor) => filtrar(() => setSegmento(valor as Segmento | null)),
              },
              {
                opcoes: TIPOS_CHIPS,
                selecionado: tipo,
                onSelecionar: (valor) => filtrar(() => setTipo(valor as TipoFiltro | null)),
              },
            ]}
            onTodos={() =>
              filtrar(() => {
                setSegmento(null);
                setTipo(null);
              })
            }
          />
        </div>
      )}

      <GradeRecomendacoes
        titulo="Investidores para você"
        selo="Recomendados pelo algoritmo de tese"
        carregando={carregando}
        erro={erro}
        tituloErro="Não foi possível carregar os investidores"
        onTentarNovamente={recarregar}
        total={investidores.length}
        totalFiltrado={filtrados.length}
        onVerMais={() => setLimite((l) => l + POR_PAGINA)}
        cards={visiveis.map((item) => ({
          chave: item.investidor.id,
          card: (
            <InvestorCard
              item={item}
              melhorMatch={item.investidor.id === idMelhorMatch}
              ocupado={estaOcupado(item.investidor.id)}
              onSalvar={() => alternarSalvo({ perfil: "startup", item })}
              onInteresse={() => demonstrarInteresse({ perfil: "startup", item })}
              onDesfazer={() => desfazer({ perfil: "startup", item })}
            />
          ),
        }))}
        vazio={
          <AvisoEstado
            icone={SearchX}
            titulo="Ainda não há investidores cadastrados"
            texto="Quando investidores criarem o perfil, eles aparecem aqui com o score de compatibilidade."
            acao={
              <Link to="/meu-perfil" className={BOTAO_CLARO}>
                Completar perfil
              </Link>
            }
          />
        }
        semResultado={
          <AvisoEstado
            icone={SearchX}
            titulo="Nenhum investidor com esses filtros"
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
        icone={ClipboardCheck}
        titulo="Complete o perfil da sua startup para receber matches mais precisos"
        texto="Segmento, estágio, capital, localização e pitch completos ajudam o algoritmo a encontrar os investidores certos."
        acao={{ para: "/meu-perfil", rotulo: "Completar perfil" }}
      />
    </div>
  );
}
