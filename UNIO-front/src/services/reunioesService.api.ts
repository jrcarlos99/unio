import type {
  ArquivoIcs,
  ContraparteReuniao,
  DadosSolicitacao,
  IntervaloDatas,
  NotificacaoReuniao,
  RespostaSolicitacao,
  Reuniao,
  SessaoReunioes,
  ValorLinkOuLocal,
} from "../types/reunioes";
import { encontrarConflito, isoValido, noPassado, somarMinutos } from "../utils/datas";
import { arquivoIcsDaReuniao } from "../utils/reunioes";
import api from "./api";
import { chaveUsuario } from "./onboardingService";
import {
  ErroReunioes,
  contraparteDoBack,
  erroDaApi,
  isoParaBack,
  paraDetailsRequest,
  paraMeetingCreateRequest,
  reuniaoDoBack,
  type CounterpartBack,
  type MeetingResponseBack,
} from "./reunioes.mapping";
import {
  derivarNotificacoes,
  fotografar,
  juntarNotificacoes,
  textoAvaliar,
  vistaDe,
  type ListaVista,
} from "./reunioesNotificacoes";

// MODO API (VITE_MOCK_BACKEND diferente de "true"). Mesmas funções e tipos do
// reunioesService.mock.ts, chamando o /api/meetings do back com o cliente
// axios `api` (D032 a D039 do back; ADR-005). Os nomes do back ficam só em
// reunioes.mapping.ts. Sem dados de exemplo.
//
// - Contrapartes ("Com quem"): GET /api/meetings/counterparts. Ainda sem
//   filtro de match (pendência D039 do back).
// - Conflito: calculado no front com as confirmadas já carregadas; o back só
//   bloqueia no aceite (409).
// - Notificações e bolinha: sem endpoint no back. A cada 30 s, enquanto há
//   alguém assinando (aba aberta e visível), busca GET /api/meetings e compara
//   com a última lista vista (localStorage por e-mail). Ver reunioesNotificacoes.ts.

const POLLING_MS = 30_000;
const CONTRAPARTES_VALIDAS_MS = 60_000;
const ERRO_CARREGAR = "Não foi possível carregar suas reuniões.";
const ERRO_SALVAR = "Não foi possível concluir. Tente novamente.";

// ---------------------------------------------------------------------------
// Estado em memória por usuário
// ---------------------------------------------------------------------------

interface EstadoUsuario {
  // Última lista completa (sem intervalo), usada no conflito síncrono
  reunioes: Reuniao[];
  carregada: boolean;
  emAndamento?: Promise<Reuniao[]>;
  contrapartes?: { em: number; lista: ContraparteReuniao[] };
}

const estados = new Map<string, EstadoUsuario>();
// Última sessão vista: o polling não recebe parâmetros
let sessaoAtiva: SessaoReunioes | null = null;

function chaveDe(sessao: SessaoReunioes) {
  return sessao.user ? chaveUsuario(sessao.user) : "";
}

function estadoDe(sessao: SessaoReunioes): EstadoUsuario {
  const chave = chaveDe(sessao);
  if (sessao.user) sessaoAtiva = sessao;
  let estado = estados.get(chave);
  if (!estado) {
    estado = { reunioes: [], carregada: false };
    estados.set(chave, estado);
  }
  return estado;
}

// ---------------------------------------------------------------------------
// localStorage: última lista vista e notificações (try/catch: pode faltar)
// ---------------------------------------------------------------------------

const chaveVistas = (userKey: string) => `unio_reunioes_vistas_${userKey}`;
const chaveNotificacoes = (userKey: string) => `unio_reunioes_notificacoes_${userKey}`;

function lerJson<T>(chave: string): T | null {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravarJson(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // sem armazenamento: as notificações ficam só nesta visita
  }
}

function lerNotificacoes(userKey: string): NotificacaoReuniao[] {
  const lista = lerJson<NotificacaoReuniao[]>(chaveNotificacoes(userKey));
  return Array.isArray(lista) ? lista : [];
}

function novoId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Avisos de mudança (sidebar, sino e página) e polling
// ---------------------------------------------------------------------------

type Ouvinte = (aviso?: string) => void;
const ouvintes = new Set<Ouvinte>();
let temporizador: number | null = null;

function avisar(aviso?: string) {
  for (const ouvinte of ouvintes) ouvinte(aviso);
}

function aoMudarVisibilidade() {
  if (document.visibilityState === "visible") void sincronizar();
}

function iniciarPolling() {
  if (temporizador !== null || typeof window === "undefined") return;
  temporizador = window.setInterval(() => void sincronizar(), POLLING_MS);
  document.addEventListener("visibilitychange", aoMudarVisibilidade);
}

function pararPolling() {
  if (temporizador === null) return;
  window.clearInterval(temporizador);
  temporizador = null;
  document.removeEventListener("visibilitychange", aoMudarVisibilidade);
}

export function assinarReunioes(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  iniciarPolling();
  return () => {
    ouvintes.delete(ouvinte);
    if (ouvintes.size === 0) pararPolling();
  };
}

// Assinatura simples da lista, para saber se algo mudou entre duas buscas
function assinatura(reunioes: Reuniao[]) {
  return reunioes
    .map((r) => `${r.id}:${r.status}:${r.solicitante}:${r.atualizadaEm}`)
    .sort()
    .join("|");
}

async function sincronizar() {
  const sessao = sessaoAtiva;
  if (!sessao?.user || document.visibilityState === "hidden") return;
  const estado = estadoDe(sessao);
  const antes = estado.carregada ? assinatura(estado.reunioes) : null;
  try {
    const lista = await carregarTudo(sessao);
    // Novas notificações já avisaram em carregarTudo; aqui só mudanças sem aviso
    if (antes !== null && antes !== assinatura(lista)) avisar();
  } catch {
    // tenta de novo no próximo ciclo
  }
}

// Compara com a última lista vista, guarda as notificações novas e avisa
function processarNovidades(sessao: SessaoReunioes, lista: Reuniao[]) {
  const userKey = chaveDe(sessao);
  if (!userKey) return;
  const anterior = lerJson<ListaVista>(chaveVistas(userKey)) ?? {};
  const novas = derivarNotificacoes(anterior, lista, new Date(), novoId);
  gravarJson(chaveVistas(userKey), fotografar(lista));
  if (novas.length === 0) return;
  gravarJson(chaveNotificacoes(userKey), juntarNotificacoes(novas, lerNotificacoes(userKey)));
  // Depois do retorno: quem chamou termina antes de os ouvintes recarregarem
  queueMicrotask(() => avisar(novas.map((n) => n.texto).join(" ")));
}

// Ações do próprio usuário: atualiza a memória e a lista vista (sem virar
// notificação para ele mesmo) e avisa as outras telas
function registrar(sessao: SessaoReunioes, reuniao: Reuniao, aviso?: string) {
  const estado = estadoDe(sessao);
  estado.reunioes = [reuniao, ...estado.reunioes.filter((r) => r.id !== reuniao.id)];
  const userKey = chaveDe(sessao);
  if (userKey) {
    const vistas = lerJson<ListaVista>(chaveVistas(userKey)) ?? {};
    vistas[reuniao.id] = vistaDe(reuniao);
    gravarJson(chaveVistas(userKey), vistas);
  }
  avisar(aviso);
}

// ---------------------------------------------------------------------------
// Leituras
// ---------------------------------------------------------------------------

async function buscarContrapartes(sessao: SessaoReunioes): Promise<ContraparteReuniao[]> {
  const estado = estadoDe(sessao);
  if (estado.contrapartes && Date.now() - estado.contrapartes.em < CONTRAPARTES_VALIDAS_MS) {
    return estado.contrapartes.lista;
  }
  try {
    const { data } = await api.get<CounterpartBack[]>("/api/meetings/counterparts");
    const lista = data.map(contraparteDoBack);
    estado.contrapartes = { em: Date.now(), lista };
    return lista;
  } catch (erro) {
    throw erroDaApi(erro, "Não foi possível carregar com quem você pode marcar reunião.");
  }
}

async function mapaContrapartes(sessao: SessaoReunioes) {
  // Sem a lista, a reunião aparece com os dados do participante
  const lista = await buscarContrapartes(sessao).catch(() => [] as ContraparteReuniao[]);
  return new Map(lista.map((c) => [c.id, c]));
}

async function buscarReunioes(sessao: SessaoReunioes, intervalo?: IntervaloDatas): Promise<Reuniao[]> {
  try {
    const params = intervalo ? { from: isoParaBack(intervalo.inicio), to: isoParaBack(intervalo.fim) } : undefined;
    const [{ data }, contrapartes] = await Promise.all([
      api.get<MeetingResponseBack[]>("/api/meetings", { params }),
      mapaContrapartes(sessao),
    ]);
    return data.map((meeting) => reuniaoDoBack(meeting, contrapartes));
  } catch (erro) {
    throw erroDaApi(erro, ERRO_CARREGAR);
  }
}

// Lista completa, com uma requisição só quando várias telas pedem juntas
function carregarTudo(sessao: SessaoReunioes): Promise<Reuniao[]> {
  const estado = estadoDe(sessao);
  if (estado.emAndamento) return estado.emAndamento;
  const promessa = buscarReunioes(sessao)
    .then((lista) => {
      estado.reunioes = lista;
      estado.carregada = true;
      processarNovidades(sessao, lista);
      return lista;
    })
    .finally(() => {
      estado.emAndamento = undefined;
    });
  estado.emAndamento = promessa;
  return promessa;
}

export async function listarContrapartes(sessao: SessaoReunioes): Promise<ContraparteReuniao[]> {
  return buscarContrapartes(sessao);
}

// Com intervalo: GET ?from=&to= (reuniões com algum horário dentro dele)
export async function listarReunioes(sessao: SessaoReunioes, intervalo?: IntervaloDatas): Promise<Reuniao[]> {
  if (!intervalo) return carregarTudo(sessao);
  const lista = await buscarReunioes(sessao, intervalo);
  const estado = estadoDe(sessao);
  const ids = new Set(lista.map((r) => r.id));
  estado.reunioes = [...lista, ...estado.reunioes.filter((r) => !ids.has(r.id))];
  return lista;
}

async function obterReuniao(sessao: SessaoReunioes, id: string): Promise<Reuniao> {
  const emMemoria = estadoDe(sessao).reunioes.find((r) => r.id === id);
  if (emMemoria) return emMemoria;
  try {
    const [{ data }, contrapartes] = await Promise.all([
      api.get<MeetingResponseBack>(`/api/meetings/${encodeURIComponent(id)}`),
      mapaContrapartes(sessao),
    ]);
    return reuniaoDoBack(data, contrapartes);
  } catch (erro) {
    throw erroDaApi(erro, "Reunião não encontrada.");
  }
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

async function enviar(
  sessao: SessaoReunioes,
  chamada: () => Promise<{ data: MeetingResponseBack }>,
  aviso?: string,
): Promise<Reuniao> {
  try {
    const [{ data }, contrapartes] = await Promise.all([chamada(), mapaContrapartes(sessao)]);
    const reuniao = reuniaoDoBack(data, contrapartes);
    registrar(sessao, reuniao, aviso);
    return reuniao;
  } catch (erro) {
    throw erroDaApi(erro, ERRO_SALVAR);
  }
}

const rota = (id: string, acao: string) => `/api/meetings/${encodeURIComponent(id)}/${acao}`;

// O corpo é montado ANTES da chamada: id de exemplo (mock) lança ErroReunioes
// com mensagem amigável e nenhuma requisição sai (ADR-007)
export async function solicitarReuniao(sessao: SessaoReunioes, dados: DadosSolicitacao): Promise<Reuniao> {
  const corpo = paraMeetingCreateRequest(dados);
  return enviar(sessao, () => api.post<MeetingResponseBack>("/api/meetings", corpo));
}

export async function responderSolicitacao(
  sessao: SessaoReunioes,
  id: string,
  resposta: RespostaSolicitacao,
): Promise<Reuniao> {
  if (resposta.acao === "aceitar") {
    if (!resposta.horario) throw new ErroReunioes("Escolha um dos horários sugeridos.");
    const startsAt = isoParaBack(resposta.horario);
    return enviar(sessao, () => api.post<MeetingResponseBack>(rota(id, "accept"), { startsAt }));
  }
  if (resposta.acao === "recusar") {
    return enviar(sessao, () => api.post<MeetingResponseBack>(rota(id, "decline")));
  }
  const suggestedTimes = (resposta.novosHorarios ?? []).map(isoParaBack);
  return enviar(sessao, () => api.post<MeetingResponseBack>(rota(id, "counter-proposal"), { suggestedTimes }));
}

// Motivo opcional (ex.: "Não aconteceu"): vai como { reason } (MeetingCancelRequest)
export async function cancelarReuniao(sessao: SessaoReunioes, id: string, motivo?: string): Promise<Reuniao> {
  const limpo = motivo?.trim();
  return enviar(sessao, () => api.post<MeetingResponseBack>(rota(id, "cancel"), limpo ? { reason: limpo } : undefined));
}

// "Compareci": POST /complete (CONFIRMADA → REALIZADA, vale para os dois
// participantes). A notificação "avaliar" de quem clicou é criada aqui; a da
// outra parte sai da comparação de listas (reunioesNotificacoes.ts).
export async function marcarComoRealizada(sessao: SessaoReunioes, id: string): Promise<Reuniao> {
  const reuniao = await enviar(sessao, () => api.post<MeetingResponseBack>(rota(id, "complete")));
  const userKey = chaveDe(sessao);
  if (userKey) {
    const nova: NotificacaoReuniao = {
      id: novoId(),
      tipo: "avaliar",
      reuniaoId: reuniao.id,
      texto: textoAvaliar(reuniao),
      em: new Date().toISOString(),
      lida: false,
    };
    gravarJson(chaveNotificacoes(userKey), juntarNotificacoes([nova], lerNotificacoes(userKey)));
    avisar();
  }
  return reuniao;
}

// Confirmada → pendente com novos horários, agora propostos por você
export async function remarcarReuniao(sessao: SessaoReunioes, id: string, novosHorarios: string[]): Promise<Reuniao> {
  const suggestedTimes = novosHorarios.map(isoParaBack);
  return enviar(sessao, () => api.post<MeetingResponseBack>(rota(id, "counter-proposal"), { suggestedTimes }));
}

export async function definirLinkOuLocal(sessao: SessaoReunioes, id: string, valor: ValorLinkOuLocal): Promise<Reuniao> {
  return enviar(sessao, () => api.patch<MeetingResponseBack>(rota(id, "details"), paraDetailsRequest(valor)));
}

// O .ics continua só no front
export async function gerarIcs(sessao: SessaoReunioes, id: string): Promise<ArquivoIcs> {
  return arquivoIcsDaReuniao(await obterReuniao(sessao, id));
}

// Síncrona: usa as reuniões já carregadas (só as confirmadas contam)
export function detectarConflito(
  sessao: SessaoReunioes,
  horarioISO: string,
  duracaoMin: number,
  ignorarId?: string,
): Reuniao | null {
  if (!isoValido(horarioISO)) return null;
  return encontrarConflito(estadoDe(sessao).reunioes, horarioISO, duracaoMin, ignorarId);
}

export async function listarNotificacoes(sessao: SessaoReunioes): Promise<NotificacaoReuniao[]> {
  const userKey = chaveDe(sessao);
  if (!userKey) return [];
  await carregarTudo(sessao).catch(() => undefined);
  return lerNotificacoes(userKey);
}

export async function marcarNotificacoesLidas(sessao: SessaoReunioes): Promise<void> {
  const userKey = chaveDe(sessao);
  const atuais = lerNotificacoes(userKey);
  if (!userKey || atuais.every((n) => n.lida)) return;
  gravarJson(
    chaveNotificacoes(userKey),
    atuais.map((n) => ({ ...n, lida: true })),
  );
  avisar();
}

// Bolinha da sidebar: solicitações recebidas aguardando sua resposta
export async function contarSolicitacoesRecebidas(sessao: SessaoReunioes): Promise<number> {
  if (!sessao.user) return 0;
  const lista = await carregarTudo(sessao);
  return lista.filter((r) => r.status === "pendente" && r.solicitante === "outro").length;
}

function ativaCom(reuniao: Reuniao, unioId: string, agora: Date) {
  if (reuniao.unioId !== unioId) return false;
  if (reuniao.status === "pendente") return true;
  return reuniao.status === "confirmada" && !!reuniao.horarioConfirmado && !noPassado(reuniao.horarioConfirmado, agora);
}

// Pendentes e confirmadas futuras com a pessoa (aviso do "Desfazer match")
export async function listarReunioesAtivasComUnio(sessao: SessaoReunioes, unioId: string): Promise<Reuniao[]> {
  const agora = new Date();
  return (await carregarTudo(sessao)).filter((r) => ativaCom(r, unioId, agora));
}

// Match desfeito: uma chamada de cancel por reunião ativa com a pessoa
export async function cancelarReunioesDoUnio(sessao: SessaoReunioes, unioId: string): Promise<number> {
  const ativas = await listarReunioesAtivasComUnio(sessao, unioId);
  let total = 0;
  for (const reuniao of ativas) {
    try {
      const { data } = await api.post<MeetingResponseBack>(rota(reuniao.id, "cancel"));
      const cancelada = reuniaoDoBack(data, await mapaContrapartes(sessao));
      registrar(sessao, cancelada);
      total += 1;
    } catch {
      // segue com as outras; a que falhou continua na agenda
    }
  }
  return total;
}

// Próxima reunião confirmada com a pessoa (atalho .ics no popup do unio)
export async function obterProximaConfirmada(sessao: SessaoReunioes, unioId: string): Promise<Reuniao | null> {
  const agora = new Date();
  const lista = await carregarTudo(sessao).catch(() => [] as Reuniao[]);
  return (
    lista
      .filter((r) => r.unioId === unioId && r.status === "confirmada" && r.horarioConfirmado)
      .filter((r) => !noPassado(somarMinutos(r.horarioConfirmado as string, r.duracaoMin), agora))
      .sort(
        (a, b) => new Date(a.horarioConfirmado as string).getTime() - new Date(b.horarioConfirmado as string).getTime(),
      )[0] ?? null
  );
}
