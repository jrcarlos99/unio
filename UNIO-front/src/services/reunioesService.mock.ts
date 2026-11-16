import { rotuloTipoInvestidor } from "../components/discovery/rotulos";
import type { UserProfile } from "../contexts/AuthContext";
import { FUNDADORES_EXEMPLO, montarExemplos } from "../mocks/reunioesMock";
import type { PerfilApp, Recomendacao } from "../types/recomendacoes";
import {
  MAX_CARACTERES_MENSAGEM,
  MAX_HORARIOS_SUGERIDOS,
  type ArquivoIcs,
  type ContraparteReuniao,
  type DadosSolicitacao,
  type IntervaloDatas,
  type LadoReuniao,
  type NotificacaoReuniao,
  type ParticipanteReuniao,
  type RespostaSolicitacao,
  type Reuniao,
  type StatusReuniao,
  type TipoNotificacao,
  type ValorLinkOuLocal,
} from "../types/reunioes";
import {
  encontrarConflito,
  formatarDataCurta,
  formatarHora,
  hojeChave,
  inicioDaSemana,
  isoValido,
  noPassado,
  somarMinutos,
} from "../utils/datas";
import { formatarFaixaTicket, formatarMoeda } from "../utils/formatoDescoberta";
import { gerarConteudoIcs } from "../utils/ics";
import { iniciais } from "../utils/nomeUsuario";
import { tituloReuniao, validarLinkHttps } from "../utils/reunioes";
import { chaveUsuario } from "./onboardingService";
import { listarUnios } from "./recomendacoesService";
import { gravarBanco, lerBanco, type BancoReunioes, type ReuniaoArmazenada } from "./reunioesStore";

// MOCK, SEM BACK. Único ponto de dados da tela de Reuniões (os dois perfis),
// do sino de notificações e da bolinha da sidebar. As telas usam SÓ estas
// funções e os tipos de types/reunioes.ts. Tudo já devolve Promise: para
// trocar pelo back, reimplementa-se cada função com chamadas HTTP (ver o
// mapeamento toBack/fromBack no fim do arquivo e o ADR-004) e as telas não
// mudam. O parâmetro `sessao` só existe por causa do localStorage e dos
// unios do mock: com a API, o token já identifica o usuário.
//
// Regras:
// - Só é possível solicitar reunião com quem deu match (unios de
//   recomendacoesService.listarUnios, status "match").
// - Quem responde uma pendente é sempre o outro lado da proposta que está
//   valendo (campo `solicitante`), independentemente do perfil.
// - Conflito = sobreposição com outra reunião confirmada sua. Só avisa.
// - Persistência: localStorage unio_reunioes_<email> (reunioesStore.ts).
//
// Mock da outra parte: cerca de 5 s depois de cada envio ímpar (1º, 3º...)
// de uma proposta sua, a contraparte aceita o primeiro horário ainda futuro;
// os envios pares ficam pendentes. Os dados de exemplo ficam em
// mocks/reunioesMock.ts.

export interface SessaoReunioes {
  user: UserProfile | null;
  perfil: PerfilApp;
}

const LATENCIA_MS = 250;
const RESPOSTA_MOCK_MS = 5000;

function esperar() {
  return new Promise((resolve) => setTimeout(resolve, LATENCIA_MS));
}

const chaveDe = (sessao: SessaoReunioes) => (sessao.user ? chaveUsuario(sessao.user) : "");

// ---------------------------------------------------------------------------
// Avisos de mudança (sidebar, sino e página se atualizam juntos)
// ---------------------------------------------------------------------------

type Ouvinte = (aviso?: string) => void;
const ouvintes = new Set<Ouvinte>();

export function assinarReunioes(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function avisar(aviso?: string) {
  for (const ouvinte of ouvintes) ouvinte(aviso);
}

// ---------------------------------------------------------------------------
// Contrapartes (unios com match)
// ---------------------------------------------------------------------------

function novoId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Código curto e estável a partir do id ("UNIO-9842")
export function gerarCodigo(id: string) {
  let hash = 0;
  for (const caractere of id) hash = (hash * 31 + caractere.charCodeAt(0)) >>> 0;
  return `UNIO-${1000 + (hash % 9000)}`;
}

function contraparteDe(rec: Recomendacao): ContraparteReuniao {
  if (rec.perfil === "investidor") {
    const { startup, compatibilidade } = rec.item;
    const fundador = FUNDADORES_EXEMPLO[startup.id];
    return {
      id: startup.id,
      nome: startup.nome,
      subtitulo: `${startup.segmento} • ${startup.cidade}, ${startup.uf}`,
      matchPercentual: compatibilidade.total,
      iniciais: iniciais(startup.nome),
      tipo: "startup",
      cargoEmpresa: fundador ? `${fundador.nome}, ${fundador.cargo}` : `Equipe ${startup.nome}`,
      selos: [startup.segmento, startup.estagio],
      destaque: {
        rotulo: "Captação atual",
        valor: `${formatarMoeda(startup.captacao.captado)} de ${formatarMoeda(startup.captacao.meta)} (${startup.captacao.rodada})`,
      },
      perfilHref: `/startups/${startup.id}`,
    };
  }
  const { investidor, compatibilidade } = rec.item;
  const temTicket = investidor.ticketMin !== null && investidor.ticketMax !== null;
  return {
    id: investidor.id,
    nome: investidor.nome,
    subtitulo: `${rotuloTipoInvestidor(investidor.tipo)} • ${investidor.cidade}, ${investidor.uf}`,
    matchPercentual: compatibilidade.total,
    iniciais: iniciais(investidor.nome),
    tipo: "investidor",
    cargoEmpresa: `${rotuloTipoInvestidor(investidor.tipo)}, ${investidor.cidade}`,
    selos: [
      investidor.segmentosInteresse.slice(0, 2).join(", "),
      investidor.estagiosInteresse.slice(0, 2).join(", "),
    ].filter(Boolean),
    destaque: temTicket
      ? {
          rotulo: "Ticket",
          valor: formatarFaixaTicket(investidor.ticketMin as number, investidor.ticketMax as number, " a "),
        }
      : { rotulo: "Mentoria", valor: `Só mentoria, disponibilidade ${investidor.disponibilidade.toLowerCase()}` },
    perfilHref: `/investidores/${investidor.id}`,
  };
}

// Quem aparece como participante da outra parte, com o papel na reunião
function participanteDe(contraparte: ContraparteReuniao, organizador: LadoReuniao): ParticipanteReuniao {
  const papel = organizador === "outro" ? "Organizador" : "Host";
  if (contraparte.tipo === "startup") {
    const fundador = FUNDADORES_EXEMPLO[contraparte.id];
    return fundador
      ? { nome: fundador.nome, cargo: fundador.cargo, papel }
      : { nome: `Equipe ${contraparte.nome}`, cargo: "Fundadores", papel };
  }
  return { nome: contraparte.nome, cargo: contraparte.cargoEmpresa.split(",")[0], papel };
}

// Unios com match, prontos para "Com quem"
export async function listarContrapartes(sessao: SessaoReunioes): Promise<ContraparteReuniao[]> {
  const unios = await listarUnios(sessao.perfil, sessao.user);
  return unios.map(contraparteDe).sort((a, b) => b.matchPercentual - a.matchPercentual);
}

// ---------------------------------------------------------------------------
// Estado: exemplos da semana atual e respostas do mock
// ---------------------------------------------------------------------------

function notificar(banco: BancoReunioes, tipo: TipoNotificacao, reuniao: Reuniao, texto: string) {
  const notificacao: NotificacaoReuniao = {
    id: novoId(),
    tipo,
    reuniaoId: reuniao.id,
    texto,
    em: new Date().toISOString(),
    lida: false,
  };
  banco.notificacoes = [notificacao, ...banco.notificacoes].slice(0, 30);
}

function quando(iso: string) {
  return `${formatarDataCurta(iso)} às ${formatarHora(iso)}`;
}

function textoRecebida(reuniao: Reuniao) {
  return `${reuniao.contraparte.nome} solicitou uma reunião: ${reuniao.assunto}.`;
}

// A "outra parte" do mock aceita as propostas cujo prazo chegou
function aplicarRespostasMock(banco: BancoReunioes, agora = new Date()): string[] {
  const avisos: string[] = [];
  for (const reuniao of banco.reunioes) {
    if (!reuniao.respostaMockEm || new Date(reuniao.respostaMockEm) > agora) continue;
    delete reuniao.respostaMockEm;
    if (reuniao.status !== "pendente" || reuniao.solicitante !== "eu") continue;
    const horario = reuniao.horariosSugeridos.find((iso) => !noPassado(iso, agora));
    if (!horario) continue;
    reuniao.status = "confirmada";
    reuniao.horarioConfirmado = horario;
    reuniao.atualizadaEm = agora.toISOString();
    const texto = `${reuniao.contraparte.nome} aceitou sua solicitação para ${quando(horario)}.`;
    notificar(banco, "aceita", reuniao, texto);
    avisos.push(texto);
  }
  return avisos;
}

function criarExemplos(banco: BancoReunioes, contrapartes: ContraparteReuniao[], sessao: SessaoReunioes) {
  const agora = new Date().toISOString();
  const exemplos = montarExemplos(contrapartes, sessao.perfil, hojeChave());
  for (const exemplo of exemplos) {
    const id = `exemplo-${novoId()}`;
    const reuniao: ReuniaoArmazenada = {
      ...exemplo,
      id,
      unioId: exemplo.contraparte.id,
      participante: participanteDe(exemplo.contraparte, exemplo.organizador),
      criadaEm: agora,
      atualizadaEm: agora,
      codigo: gerarCodigo(id),
      exemplo: true,
    };
    banco.reunioes.push(reuniao);
    if (reuniao.status === "pendente") notificar(banco, "recebida", reuniao, textoRecebida(reuniao));
  }
}

// Carrega o banco, cria/renova os exemplos da semana e aplica as respostas
// do mock. Também atualiza o snapshot da contraparte (match % atual).
async function preparar(sessao: SessaoReunioes): Promise<BancoReunioes> {
  const userKey = chaveDe(sessao);
  if (!userKey) return lerBanco(userKey);
  const contrapartes = await listarContrapartes(sessao);
  // Lido só depois do await: daqui até gravar é tudo síncrono, então duas
  // chamadas ao mesmo tempo (sidebar e página) não criam exemplos em dobro
  const banco = lerBanco(userKey);
  let mudou = false;

  const semana = inicioDaSemana(hojeChave());
  if (banco.semanaExemplos !== semana && contrapartes.length > 0) {
    const idsExemplo = new Set(banco.reunioes.filter((r) => r.exemplo).map((r) => r.id));
    banco.reunioes = banco.reunioes.filter((r) => !r.exemplo);
    banco.notificacoes = banco.notificacoes.filter((n) => !idsExemplo.has(n.reuniaoId));
    criarExemplos(banco, contrapartes, sessao);
    banco.semanaExemplos = semana;
    mudou = true;
  }

  const atuais = new Map(contrapartes.map((c) => [c.id, c]));
  for (const reuniao of banco.reunioes) {
    const atual = atuais.get(reuniao.unioId);
    if (atual && JSON.stringify(atual) !== JSON.stringify(reuniao.contraparte)) {
      reuniao.contraparte = atual;
      mudou = true;
    }
  }

  const avisos = aplicarRespostasMock(banco);
  if (mudou || avisos.length > 0) gravarBanco(userKey, banco);
  return banco;
}

function agendarRespostaMock(sessao: SessaoReunioes, banco: BancoReunioes, reuniao: ReuniaoArmazenada) {
  banco.envios += 1;
  if (banco.envios % 2 === 0) return;
  reuniao.respostaMockEm = new Date(Date.now() + RESPOSTA_MOCK_MS).toISOString();
  const userKey = chaveDe(sessao);
  window.setTimeout(() => {
    const atual = lerBanco(userKey);
    const avisos = aplicarRespostasMock(atual);
    if (avisos.length === 0) return;
    gravarBanco(userKey, atual);
    avisar(avisos.join(" "));
  }, RESPOSTA_MOCK_MS + 100);
}

// Sem os campos internos do mock
function publica(reuniao: ReuniaoArmazenada): Reuniao {
  const copia: ReuniaoArmazenada = { ...reuniao };
  delete copia.exemplo;
  delete copia.respostaMockEm;
  return copia;
}

function buscar(banco: BancoReunioes, id: string): ReuniaoArmazenada {
  const reuniao = banco.reunioes.find((item) => item.id === id);
  if (!reuniao) throw new Error("Reunião não encontrada.");
  return reuniao;
}

function salvar(sessao: SessaoReunioes, banco: BancoReunioes, aviso?: string) {
  gravarBanco(chaveDe(sessao), banco);
  avisar(aviso);
}

// ---------------------------------------------------------------------------
// Validação (as telas validam por campo; aqui é a garantia final)
// ---------------------------------------------------------------------------

function validarHorarios(horarios: string[]) {
  if (horarios.length < 1 || horarios.length > MAX_HORARIOS_SUGERIDOS) {
    throw new Error(`Informe de 1 a ${MAX_HORARIOS_SUGERIDOS} horários.`);
  }
  if (horarios.some((iso) => !isoValido(iso))) throw new Error("Horário inválido.");
  if (horarios.some((iso) => noPassado(iso))) throw new Error("Não é possível sugerir horário no passado.");
  if (new Set(horarios).size !== horarios.length) throw new Error("Há horários repetidos.");
}

function ordenarHorarios(horarios: string[]) {
  return [...horarios].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

// ---------------------------------------------------------------------------
// API usada pelas telas
// ---------------------------------------------------------------------------

function horariosDaReuniao(reuniao: Reuniao) {
  return reuniao.horarioConfirmado ? [reuniao.horarioConfirmado] : reuniao.horariosSugeridos;
}

// Reuniões do usuário. Com intervalo, só as que têm algum horário dentro dele
// (o confirmado ou, nas pendentes, um dos sugeridos).
export async function listarReunioes(sessao: SessaoReunioes, intervalo?: IntervaloDatas): Promise<Reuniao[]> {
  const banco = await preparar(sessao);
  await esperar();
  const inicio = intervalo ? new Date(intervalo.inicio).getTime() : -Infinity;
  const fim = intervalo ? new Date(intervalo.fim).getTime() : Infinity;
  return banco.reunioes
    .filter((reuniao) =>
      horariosDaReuniao(reuniao).some((iso) => {
        const t = new Date(iso).getTime();
        return t >= inicio && t < fim;
      }),
    )
    .map(publica);
}

export async function solicitarReuniao(sessao: SessaoReunioes, dados: DadosSolicitacao): Promise<Reuniao> {
  const contraparte = (await listarContrapartes(sessao)).find((item) => item.id === dados.unioId);
  if (!contraparte) throw new Error("Só é possível solicitar reunião com quem deu match.");
  const banco = await preparar(sessao);
  validarHorarios(dados.horarios);
  const mensagem = dados.mensagem?.trim();
  if (mensagem && mensagem.length > MAX_CARACTERES_MENSAGEM) throw new Error("Mensagem muito longa.");
  let link: string | undefined;
  if (dados.formato === "online" && dados.link?.trim()) {
    link = validarLinkHttps(dados.link) ?? undefined;
    if (!link) throw new Error("O link da reunião precisa começar com https://");
  }
  const local = dados.formato === "presencial" && dados.local?.nome.trim() ? dados.local : undefined;

  const agora = new Date().toISOString();
  const id = novoId();
  const reuniao: ReuniaoArmazenada = {
    id,
    unioId: contraparte.id,
    solicitante: "eu",
    organizador: "eu",
    contraparte,
    participante: participanteDe(contraparte, "eu"),
    assunto: dados.assunto,
    duracaoMin: dados.duracaoMin,
    formato: dados.formato,
    ...(mensagem ? { mensagem } : {}),
    horariosSugeridos: ordenarHorarios(dados.horarios),
    ...(link ? { link } : {}),
    ...(local ? { local } : {}),
    status: "pendente",
    criadaEm: agora,
    atualizadaEm: agora,
    codigo: gerarCodigo(id),
  };
  banco.reunioes.push(reuniao);
  agendarRespostaMock(sessao, banco, reuniao);
  salvar(sessao, banco);
  return publica(reuniao);
}

export async function responderSolicitacao(
  sessao: SessaoReunioes,
  id: string,
  resposta: RespostaSolicitacao,
): Promise<Reuniao> {
  await esperar();
  const banco = await preparar(sessao);
  const reuniao = buscar(banco, id);
  if (reuniao.status !== "pendente" || reuniao.solicitante !== "outro") {
    throw new Error("Esta solicitação não está mais aguardando a sua resposta.");
  }
  const agora = new Date().toISOString();
  if (resposta.acao === "aceitar") {
    const horario = resposta.horario;
    if (!horario || !reuniao.horariosSugeridos.includes(horario)) throw new Error("Escolha um dos horários sugeridos.");
    if (noPassado(horario)) throw new Error("Esse horário já passou. Proponha outros horários.");
    reuniao.status = "confirmada";
    reuniao.horarioConfirmado = horario;
  } else if (resposta.acao === "recusar") {
    reuniao.status = "recusada";
  } else {
    const novos = resposta.novosHorarios ?? [];
    validarHorarios(novos);
    reuniao.horariosSugeridos = ordenarHorarios(novos);
    reuniao.solicitante = "eu";
    agendarRespostaMock(sessao, banco, reuniao);
  }
  reuniao.atualizadaEm = agora;
  salvar(sessao, banco);
  return publica(reuniao);
}

// Cancela uma confirmada ou uma pendente (inclusive "Cancelar solicitação")
export async function cancelarReuniao(sessao: SessaoReunioes, id: string): Promise<Reuniao> {
  await esperar();
  const banco = await preparar(sessao);
  const reuniao = buscar(banco, id);
  if (reuniao.status !== "pendente" && reuniao.status !== "confirmada") {
    throw new Error("Esta reunião já foi encerrada.");
  }
  reuniao.status = "cancelada";
  reuniao.atualizadaEm = new Date().toISOString();
  delete reuniao.respostaMockEm;
  salvar(sessao, banco);
  return publica(reuniao);
}

// Volta a pendente com novos horários, agora propostos por você
export async function remarcarReuniao(sessao: SessaoReunioes, id: string, novosHorarios: string[]): Promise<Reuniao> {
  await esperar();
  const banco = await preparar(sessao);
  const reuniao = buscar(banco, id);
  if (reuniao.status !== "confirmada" && !(reuniao.status === "pendente" && reuniao.solicitante === "eu")) {
    throw new Error("Não é possível remarcar esta reunião.");
  }
  validarHorarios(novosHorarios);
  reuniao.status = "pendente";
  reuniao.solicitante = "eu";
  reuniao.horariosSugeridos = ordenarHorarios(novosHorarios);
  delete reuniao.horarioConfirmado;
  delete reuniao.respostaMockEm;
  reuniao.atualizadaEm = new Date().toISOString();
  agendarRespostaMock(sessao, banco, reuniao);
  salvar(sessao, banco);
  return publica(reuniao);
}

// Link (online) ou local (presencial). Só quem organiza pode alterar.
export async function definirLinkOuLocal(
  sessao: SessaoReunioes,
  id: string,
  valor: ValorLinkOuLocal,
): Promise<Reuniao> {
  await esperar();
  const banco = await preparar(sessao);
  const reuniao = buscar(banco, id);
  if (reuniao.organizador !== "eu") throw new Error("Só quem organiza a reunião pode alterar o link ou o local.");
  if ("link" in valor) {
    if (!valor.link.trim()) {
      delete reuniao.link;
    } else {
      const link = validarLinkHttps(valor.link);
      if (!link) throw new Error("O link da reunião precisa começar com https://");
      reuniao.link = link;
    }
  } else {
    const nome = valor.local.nome.trim();
    const endereco = valor.local.endereco.trim();
    const referencia = valor.local.referencia?.trim();
    if (!nome || !endereco) throw new Error("Informe o nome e o endereço do local.");
    reuniao.local = { nome, endereco, ...(referencia ? { referencia } : {}) };
  }
  reuniao.atualizadaEm = new Date().toISOString();
  salvar(sessao, banco);
  return publica(reuniao);
}

export async function gerarIcs(sessao: SessaoReunioes, id: string): Promise<ArquivoIcs> {
  await esperar();
  const banco = await preparar(sessao);
  const reuniao = buscar(banco, id);
  if (reuniao.status !== "confirmada" || !reuniao.horarioConfirmado) {
    throw new Error("Só reuniões confirmadas podem ir para o calendário.");
  }
  const link = reuniao.formato === "online" ? validarLinkHttps(reuniao.link) : null;
  const local =
    reuniao.formato === "presencial" && reuniao.local
      ? [reuniao.local.nome, reuniao.local.endereco].filter(Boolean).join(", ")
      : undefined;
  const descricao = [
    `${reuniao.assunto} com ${reuniao.contraparte.nome} (UNIO).`,
    reuniao.pauta || reuniao.mensagem,
    link ? `Link: ${link}` : undefined,
    reuniao.local?.referencia ? `Referência: ${reuniao.local.referencia}` : undefined,
    `ID #${reuniao.codigo}`,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    nomeArquivo: `reuniao-${reuniao.codigo.toLowerCase()}.ics`,
    conteudo: gerarConteudoIcs({
      uid: `${reuniao.id}@unio.app`,
      inicio: reuniao.horarioConfirmado,
      duracaoMin: reuniao.duracaoMin,
      titulo: tituloReuniao(reuniao),
      descricao,
      ...(local ? { local } : {}),
      ...(link ? { url: link } : {}),
    }),
  };
}

// Síncrona de propósito: a tela checa a cada horário digitado. Usa as
// reuniões já guardadas (com a API, usaria a lista já carregada).
export function detectarConflito(
  sessao: SessaoReunioes,
  horarioISO: string,
  duracaoMin: number,
  ignorarId?: string,
): Reuniao | null {
  if (!isoValido(horarioISO)) return null;
  const conflito = encontrarConflito(lerBanco(chaveDe(sessao)).reunioes, horarioISO, duracaoMin, ignorarId);
  return conflito ? publica(conflito) : null;
}

export async function listarNotificacoes(sessao: SessaoReunioes): Promise<NotificacaoReuniao[]> {
  const banco = await preparar(sessao);
  return banco.notificacoes;
}

export async function marcarNotificacoesLidas(sessao: SessaoReunioes): Promise<void> {
  const banco = lerBanco(chaveDe(sessao));
  if (banco.notificacoes.every((n) => n.lida)) return;
  banco.notificacoes = banco.notificacoes.map((n) => ({ ...n, lida: true }));
  salvar(sessao, banco);
}

// Bolinha da sidebar: solicitações recebidas aguardando sua resposta
export async function contarSolicitacoesRecebidas(sessao: SessaoReunioes): Promise<number> {
  const banco = await preparar(sessao);
  return banco.reunioes.filter((r) => r.status === "pendente" && r.solicitante === "outro").length;
}

function ativaComUnio(reuniao: Reuniao, unioId: string, agora: Date) {
  if (reuniao.unioId !== unioId) return false;
  if (reuniao.status === "pendente") return true;
  return reuniao.status === "confirmada" && !!reuniao.horarioConfirmado && !noPassado(reuniao.horarioConfirmado, agora);
}

// Pendentes e confirmadas futuras com um unio (aviso do "Desfazer match")
export async function listarReunioesAtivasComUnio(sessao: SessaoReunioes, unioId: string): Promise<Reuniao[]> {
  const banco = lerBanco(chaveDe(sessao));
  const agora = new Date();
  return banco.reunioes.filter((r) => ativaComUnio(r, unioId, agora)).map(publica);
}

// Match desfeito: cancela as pendentes e as confirmadas futuras com o unio
export async function cancelarReunioesDoUnio(sessao: SessaoReunioes, unioId: string): Promise<number> {
  const banco = lerBanco(chaveDe(sessao));
  const agora = new Date();
  let total = 0;
  for (const reuniao of banco.reunioes) {
    if (!ativaComUnio(reuniao, unioId, agora)) continue;
    reuniao.status = "cancelada";
    reuniao.atualizadaEm = agora.toISOString();
    delete reuniao.respostaMockEm;
    total += 1;
  }
  if (total > 0) salvar(sessao, banco);
  return total;
}

// Próxima reunião confirmada com um unio (atalho .ics no popup do unio)
export async function obterProximaConfirmada(sessao: SessaoReunioes, unioId: string): Promise<Reuniao | null> {
  const banco = lerBanco(chaveDe(sessao));
  const agora = new Date();
  const proxima = banco.reunioes
    .filter((r) => r.unioId === unioId && r.status === "confirmada" && r.horarioConfirmado)
    .filter((r) => !noPassado(somarMinutos(r.horarioConfirmado as string, r.duracaoMin), agora))
    .sort((a, b) => new Date(a.horarioConfirmado as string).getTime() - new Date(b.horarioConfirmado as string).getTime())[0];
  return proxima ? publica(proxima) : null;
}

// ---------------------------------------------------------------------------
// Compatibilidade com o back futuro (/api/meetings, branch
// feat/p2-comunicacao-lgpd-qualidade). Isolado aqui; ver ADR-004.
// O back não tem horários sugeridos nem local: até ele aceitar, o front envia
// só o horário aceito (startsAt) e o local vai no texto da pauta.
// ---------------------------------------------------------------------------

export type StatusBack = "PENDENTE" | "CONFIRMADA" | "RECUSADA" | "CANCELADA" | "REALIZADA";

const PARA_BACK: Record<StatusReuniao, StatusBack> = {
  pendente: "PENDENTE",
  confirmada: "CONFIRMADA",
  recusada: "RECUSADA",
  cancelada: "CANCELADA",
};

export function toBackStatus(status: StatusReuniao): StatusBack {
  return PARA_BACK[status];
}

// REALIZADA não existe no front: é uma confirmada que já passou
export function fromBackStatus(status: StatusBack): StatusReuniao {
  return status === "REALIZADA" ? "confirmada" : (status.toLowerCase() as StatusReuniao);
}

export interface MeetingCreateRequestBack {
  participantId: number;
  title: string;
  agenda?: string;
  startsAt: string;
  durationMinutes: number;
  meetingUrl?: string;
}

export function paraMeetingCreateRequest(
  reuniao: Reuniao,
  participantId: number,
  horarioAceito: string,
): MeetingCreateRequestBack {
  const local = reuniao.local
    ? `Local: ${reuniao.local.nome}, ${reuniao.local.endereco}${reuniao.local.referencia ? ` (${reuniao.local.referencia})` : ""}`
    : undefined;
  const agenda = [reuniao.assunto, reuniao.pauta || reuniao.mensagem, local].filter(Boolean).join("\n").slice(0, 2000);
  const link = validarLinkHttps(reuniao.link);
  return {
    participantId,
    title: tituloReuniao(reuniao).slice(0, 150),
    agenda,
    startsAt: horarioAceito,
    durationMinutes: reuniao.duracaoMin,
    ...(link ? { meetingUrl: link } : {}),
  };
}
