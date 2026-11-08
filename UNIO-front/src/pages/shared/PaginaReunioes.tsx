import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Download, Info, Plus } from "lucide-react";
import AvisoEstado from "../../components/discovery/AvisoEstado";
import { FOCO_VISIVEL } from "../../components/onboarding/selecao";
import CalendarioDia from "../../components/reunioes/CalendarioDia";
import CalendarioSemana from "../../components/reunioes/CalendarioSemana";
import { BOTAO_ICONE, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "../../components/reunioes/estilos";
import MiniCalendario from "../../components/reunioes/MiniCalendario";
import PainelSolicitacoes from "../../components/reunioes/PainelSolicitacoes";
import ReuniaoDrawer from "../../components/reunioes/ReuniaoDrawer";
import SolicitacaoRecebidaDrawer from "../../components/reunioes/SolicitacaoRecebidaDrawer";
import SolicitarReuniaoModal from "../../components/reunioes/SolicitarReuniaoModal";
import { useCarregamento } from "../../hooks/useDescoberta";
import { useReunioes, useSessaoReunioes } from "../../hooks/useReunioes";
import { useToast } from "../../hooks/useToast";
import {
  cancelarReuniao,
  listarContrapartes,
  responderSolicitacao,
  type SessaoReunioes,
} from "../../services/reunioesService";
import type { PerfilApp } from "../../types/recomendacoes";
import type { Reuniao } from "../../types/reunioes";
import {
  DIAS_CURTOS,
  chaveDia,
  diaDaSemana,
  diasDaSemana,
  formatarDiaCabecalho,
  formatarIntervaloSemana,
  hojeChave,
  noPassado,
  numeroDoDia,
  somarDias,
} from "../../utils/datas";
import { ehEnviadaPendente, ehRecebidaPendente } from "../../utils/reunioes";

type Visao = "dia" | "semana";

const CONSULTA_MOBILE = "(max-width: 767px)";

function assinarMidia(avisar: () => void) {
  const midia = window.matchMedia(CONSULTA_MOBILE);
  midia.addEventListener("change", avisar);
  return () => midia.removeEventListener("change", avisar);
}

function useMobile() {
  return useSyncExternalStore(
    assinarMidia,
    () => window.matchMedia(CONSULTA_MOBILE).matches,
    () => false,
  );
}

// Hora atual, atualizada a cada minuto (linha vermelha e "hoje")
function useAgora() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const intervalo = window.setInterval(() => setAgora(new Date()), 60_000);
    return () => window.clearInterval(intervalo);
  }, []);
  return agora;
}

function horariosNaGrade(reuniao: Reuniao) {
  return reuniao.status === "confirmada" && reuniao.horarioConfirmado
    ? [reuniao.horarioConfirmado]
    : reuniao.horariosSugeridos;
}

const TEXTOS: Record<PerfilApp, { semUnios: string }> = {
  investidor: { semUnios: "Você só pode solicitar reunião com startups com quem deu match." },
  startup: { semUnios: "Você só pode solicitar reunião com investidores com quem deu match." },
};

interface EstadoModal {
  unioId?: string;
  horario?: string;
}

// Reuniões (investidor e startup, mesmo código): calendário semanal estilo
// Teams com as confirmadas e as pendentes, solicitações recebidas e
// enviadas, e os fluxos de solicitar, responder, remarcar e cancelar. Dados
// só do reunioesService. ?reuniao=<id> abre o detalhe direto (sino).
export default function PaginaReunioes({ perfil }: { perfil: PerfilApp }) {
  const sessaoBase = useSessaoReunioes();
  const sessao: SessaoReunioes = useMemo(() => ({ user: sessaoBase.user, perfil }), [sessaoBase.user, perfil]);
  const { mostrar } = useToast();
  const avisarOutraParte = useCallback((aviso: string) => mostrar(aviso, "match"), [mostrar]);
  const { carregando, erro, reunioes, recarregar } = useReunioes(sessao, avisarOutraParte);

  const carregarUnios = useCallback(() => listarContrapartes(sessao), [sessao]);
  const { dados: contrapartes } = useCarregamento(carregarUnios, "Não foi possível carregar seus unios.");

  const agora = useAgora();
  const hoje = hojeChave(agora);
  const mobile = useMobile();
  const [visaoEscolhida, setVisaoEscolhida] = useState<Visao | null>(null);
  const visao: Visao = visaoEscolhida ?? (mobile ? "dia" : "semana");
  const [foco, setFoco] = useState(() => hojeChave());
  const [modal, setModal] = useState<EstadoModal | null>(null);
  const [idAberta, setIdAberta] = useState<string | null>(null);
  const [listaAberta, setListaAberta] = useState(false);
  const [params, setParams] = useSearchParams();

  // Deep link do sino: /reunioes?reuniao=<id> abre o detalhe e leva à semana
  // dele (ajuste de estado durante o render, uma vez por link)
  const idDoLink = params.get("reuniao");
  const [linkTratado, setLinkTratado] = useState<string | null>(null);
  if (idDoLink && !carregando && linkTratado !== idDoLink) {
    setLinkTratado(idDoLink);
    const alvo = reunioes.find((reuniao) => reuniao.id === idDoLink);
    if (alvo) {
      setIdAberta(alvo.id);
      const horario = alvo.horarioConfirmado ?? alvo.horariosSugeridos[0];
      if (horario) setFoco(chaveDia(horario));
    }
  }

  function fecharDetalhe() {
    setIdAberta(null);
    if (params.has("reuniao")) setParams({}, { replace: true });
  }

  const visiveis = useMemo(
    () => reunioes.filter((reuniao) => reuniao.status === "confirmada" || reuniao.status === "pendente"),
    [reunioes],
  );
  const recebidas = useMemo(
    () =>
      visiveis
        .filter(ehRecebidaPendente)
        .sort((a, b) => a.horariosSugeridos[0].localeCompare(b.horariosSugeridos[0])),
    [visiveis],
  );
  const enviadas = useMemo(() => visiveis.filter(ehEnviadaPendente), [visiveis]);
  const reunioesPorDia = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const reuniao of visiveis) {
      for (const dia of new Set(horariosNaGrade(reuniao).map(chaveDia))) mapa.set(dia, (mapa.get(dia) ?? 0) + 1);
    }
    return mapa;
  }, [visiveis]);

  const aberta = idAberta ? (reunioes.find((reuniao) => reuniao.id === idAberta) ?? null) : null;
  const dias = diasDaSemana(foco);
  const totalSolicitacoes = recebidas.length + enviadas.length;
  const semUnios = contrapartes !== null && contrapartes.length === 0;

  function mover(delta: number) {
    setFoco((atual) => somarDias(atual, visao === "semana" ? delta * 7 : delta));
  }

  function irParaDia(dia: string) {
    setFoco(dia);
    setVisaoEscolhida("dia");
  }

  function abrirCelula(iso: string) {
    setModal(noPassado(iso) ? {} : { horario: iso });
  }

  async function recusar(reuniao: Reuniao) {
    try {
      await responderSolicitacao(sessao, reuniao.id, { acao: "recusar" });
      mostrar(`Solicitação de ${reuniao.contraparte.nome} recusada.`, "sucesso");
    } catch (falha) {
      mostrar(falha instanceof Error ? falha.message : "Não foi possível recusar.", "erro");
    }
  }

  async function cancelarSolicitacao(reuniao: Reuniao) {
    try {
      await cancelarReuniao(sessao, reuniao.id);
      mostrar(`Solicitação para ${reuniao.contraparte.nome} cancelada.`, "sucesso");
    } catch (falha) {
      mostrar(falha instanceof Error ? falha.message : "Não foi possível cancelar.", "erro");
    }
  }

  const propsGrade = {
    hoje,
    agora,
    reunioes: visiveis,
    onAbrirEvento: (reuniao: Reuniao) => setIdAberta(reuniao.id),
    onCelula: abrirCelula,
  };

  const painel = (
    <PainelSolicitacoes
      recebidas={recebidas}
      enviadas={enviadas}
      onVerHorarios={(reuniao) => setIdAberta(reuniao.id)}
      onAbrirEnviada={(reuniao) => setIdAberta(reuniao.id)}
      onRecusar={recusar}
      onCancelar={cancelarSolicitacao}
    />
  );

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-lightgray pb-5">
        <h1 tabIndex={-1} className="text-3xl font-bold text-deepgreen focus:outline-none">
          Reuniões
        </h1>
        <button type="button" onClick={() => setModal({})} className={`${BOTAO_PRIMARIO} max-md:hidden`}>
          <Plus size={18} aria-hidden="true" />
          Solicitar reunião
        </button>
      </div>

      {semUnios && (
        <p className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-lightgray/60 px-4 py-3 text-sm">
          <Info size={16} className="shrink-0" aria-hidden="true" />
          {TEXTOS[perfil].semUnios}
          <Link to="/meus-unios" className={`rounded font-semibold underline ${FOCO_VISIVEL}`}>
            Ver Meus unios
          </Link>
        </p>
      )}

      {/* Barra de navegação */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setFoco(hoje)} className={`${BOTAO_SECUNDARIO} min-h-[40px] px-4`}>
          Hoje
        </button>
        <div className="flex">
          <button
            type="button"
            onClick={() => mover(-1)}
            aria-label={visao === "semana" ? "Semana anterior" : "Dia anterior"}
            className={BOTAO_ICONE}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => mover(1)}
            aria-label={visao === "semana" ? "Próxima semana" : "Próximo dia"}
            className={BOTAO_ICONE}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
        <p className="min-w-0 flex-1 truncate text-base font-bold first-letter:uppercase sm:text-lg" aria-live="polite">
          {visao === "semana" ? formatarIntervaloSemana(foco) : formatarDiaCabecalho(foco)}
        </p>
        <div role="group" aria-label="Visualização" className="flex rounded-2xl bg-lightgray/60 p-1">
          {(["dia", "semana"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setVisaoEscolhida(opcao)}
              aria-pressed={visao === opcao}
              className={`min-h-[36px] rounded-xl px-4 text-sm font-semibold transition ${FOCO_VISIVEL} ${
                visao === opcao ? "bg-white text-deepgreen shadow-soft" : "text-deepgreen/75 hover:text-deepgreen"
              }`}
            >
              {opcao === "dia" ? "Dia" : "Semana"}
            </button>
          ))}
        </div>
      </div>

      {/* Faixa de dias (mobile) */}
      {mobile && (
        <div className="mb-4 grid grid-cols-7 gap-1" role="group" aria-label="Dias da semana">
          {dias.map((dia) => {
            const selecionado = dia === foco;
            const total = reunioesPorDia.get(dia) ?? 0;
            return (
              <button
                key={dia}
                type="button"
                onClick={() => irParaDia(dia)}
                aria-pressed={selecionado}
                aria-current={dia === hoje ? "date" : undefined}
                aria-label={`${DIAS_CURTOS[diaDaSemana(dia)]} ${numeroDoDia(dia)}${dia === hoje ? ", hoje" : ""}${
                  total ? `, ${total} ${total === 1 ? "reunião" : "reuniões"}` : ""
                }`}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-2xl text-xs transition ${FOCO_VISIVEL} ${
                  selecionado
                    ? "bg-deepgreen text-white"
                    : dia === hoje
                      ? "bg-sage/20 text-deepgreen"
                      : "bg-white text-deepgreen hover:bg-lightgray/60"
                }`}
              >
                <span className="font-semibold uppercase">{DIAS_CURTOS[diaDaSemana(dia)]}</span>
                <span className="text-base font-bold">{numeroDoDia(dia)}</span>
                <span
                  aria-hidden="true"
                  className={`h-1 w-1 rounded-full ${total ? (selecionado ? "bg-white" : "bg-deepgreen") : "bg-transparent"}`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Solicitações abaixo de lg: cartão que abre a lista */}
      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setListaAberta((atual) => !atual)}
          aria-expanded={listaAberta}
          aria-controls="lista-solicitacoes"
          disabled={totalSolicitacoes === 0}
          className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-lightgray bg-white px-4 py-3 text-left shadow-soft disabled:shadow-none ${FOCO_VISIVEL}`}
        >
          <span>
            <span className="block text-sm font-bold">
              {totalSolicitacoes === 0
                ? "Nenhuma solicitação pendente"
                : `${totalSolicitacoes} ${totalSolicitacoes === 1 ? "solicitação" : "solicitações"}`}
            </span>
            {totalSolicitacoes > 0 && (
              <span className="block text-xs text-deepgreen/75">
                {recebidas.length} {recebidas.length === 1 ? "recebida" : "recebidas"}, {enviadas.length}{" "}
                {enviadas.length === 1 ? "enviada" : "enviadas"}
              </span>
            )}
          </span>
          {totalSolicitacoes > 0 && (
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={`shrink-0 transition ${listaAberta ? "rotate-180" : ""}`}
            />
          )}
        </button>
        {listaAberta && totalSolicitacoes > 0 && (
          <div id="lista-solicitacoes" className="mt-3">
            {painel}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {erro ? (
            <AvisoEstado
              erro
              icone={CircleAlert}
              titulo="Não foi possível carregar suas reuniões"
              texto={erro}
              acao={
                <button type="button" onClick={recarregar} className={BOTAO_SECUNDARIO}>
                  Tentar novamente
                </button>
              }
            />
          ) : carregando ? (
            <div className="h-[560px] animate-pulse rounded-2xl bg-lightgray" aria-busy="true">
              <span className="sr-only">Carregando reuniões</span>
            </div>
          ) : visao === "semana" ? (
            <CalendarioSemana {...propsGrade} dias={dias} onSelecionarDia={irParaDia} />
          ) : (
            <CalendarioDia {...propsGrade} dia={foco} onMudarDia={mover} />
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-deepgreen/75">
            <ul className="flex flex-wrap gap-4" aria-label="Legenda">
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-deepgreen" aria-hidden="true" />
                Confirmada
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border-2 border-dashed border-sage bg-sage/20" aria-hidden="true" />
                Aguardando confirmação
              </li>
            </ul>
            <p className="flex items-center gap-1.5">
              <Download size={14} aria-hidden="true" />
              Exporte para o seu calendário em .ics
            </p>
          </div>
        </div>

        <aside className="hidden space-y-4 lg:block" aria-label="Calendário do mês e solicitações">
          <MiniCalendario diaSelecionado={foco} hoje={hoje} reunioesPorDia={reunioesPorDia} onEscolher={irParaDia} />
          {painel}
        </aside>
      </div>

      {/* Botão flutuante (mobile) */}
      <button
        type="button"
        onClick={() => setModal({})}
        aria-label="Solicitar reunião"
        className={`fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-deepgreen text-white shadow-soft-lg transition hover:bg-sage hover:text-deepgreen md:hidden ${FOCO_VISIVEL}`}
      >
        <Plus size={26} aria-hidden="true" />
      </button>

      {modal && (
        <SolicitarReuniaoModal
          sessao={sessao}
          unioInicial={modal.unioId}
          horarioInicial={modal.horario}
          onFechar={() => setModal(null)}
        />
      )}

      {aberta &&
        (ehRecebidaPendente(aberta) ? (
          <SolicitacaoRecebidaDrawer
            key={`${aberta.id}-${aberta.atualizadaEm}`}
            sessao={sessao}
            reuniao={aberta}
            onFechar={fecharDetalhe}
          />
        ) : (
          <ReuniaoDrawer key={aberta.id} sessao={sessao} reuniao={aberta} onFechar={fecharDetalhe} />
        ))}
    </div>
  );
}
