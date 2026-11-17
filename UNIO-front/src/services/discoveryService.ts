import { CONTATOS_STARTUPS } from "../mocks/contatosMock";
import { TESOURARIA_MOCK } from "../mocks/startupsMock";
import api from "./api";
import type { DadosUnio, TipoEventoUnio } from "../types/contato";
import type {
  FiltrosDescoberta,
  StartupDescoberta,
  StartupDetalhe,
  StartupRecomendada,
  StatusInteresse,
  TeseInvestidor,
} from "../types/discovery";
import type { RespostasInvestidor } from "../types/onboarding";
import { contatoValido } from "../utils/contato";
import { formatarMoeda } from "../utils/formatoDescoberta";
import { teseDasRespostas } from "./compatibilidade";
import { loadAnswers } from "./onboardingService";
import { unioLocalInvestidor as unioLocal } from "./unioLocal";

// Único ponto de dados das telas do investidor (Descobrir, Perfil da startup,
// Salvos, Meus unios). As telas usam SÓ estas funções; quando o back tiver os
// endpoints, troca-se a implementação aqui por chamadas HTTP (por isso tudo
// já retorna Promise) e as telas não mudam. O parâmetro userKey (e-mail) só
// existe por causa do localStorage: com a API, o token já identifica o usuário.
//
// MOCK — o que AINDA NÃO EXISTE no back (levar ao squad):
// - Listagem de startups recomendadas para o investidor logado, com busca e
//   filtro por segmento/estágio, e o detalhe de uma startup por id.
// - Score de compatibilidade por par investidor × startup, com as notas por
//   critério (segmento, estágio, ticket, região, disponibilidade). Hoje é
//   calculado no front em services/compatibilidade.ts.
// - Campos da startup usados nos prints (ver mocks/startupsMock.ts).
// - Salvos (bookmark) por investidor.
// - Interesse e MATCH MÚTUO: o investidor registra interesse (status
//   "enviado"); quando a startup também demonstra interesse, vira "match" e a
//   startup entra em "Meus unios". Antes do match não há conversa nem reunião.
//   Precisa de endpoints dos dois lados (investidor e startup) e de um status
//   por par. No mock, "interesseReciproco" faz o match acontecer na hora.
// - Tesouraria alocada do investidor.
// - Contato da startup (só para quem deu match), desfazer match e eventos de
//   contato/reunião (ver mocks/contatosMock.ts e services/unioLocal.ts).
//
// Salvos e interesses ficam no localStorage, por e-mail do usuário.

const INVESTOR_ID = "00000000-0000-0000-0000-000000000002";

const chaveSalvos = (userKey: string) => `unio_salvos_${userKey}`;
const chaveInteresses = (userKey: string) => `unio_interesses_${userKey}`;

type InteressesSalvos = Record<string, Exclude<StatusInteresse, "nenhum">>;

// localStorage pode lançar erro (modo privado, cota cheia); nesse caso a tela
// continua funcionando, só não lembra dos salvos/interesses ao recarregar.
function ler<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // ver comentário em ler()
  }
}

const lerSalvos = (userKey: string) => ler<string[]>(chaveSalvos(userKey), []);
const lerInteresses = (userKey: string) => ler<InteressesSalvos>(chaveInteresses(userKey), {});

interface RecommendationResponse {
  startupId?: unknown;
  startupName?: unknown;
  scoreFinal?: unknown;
  classification?: unknown;
}

function mapearRecomendacao(data: RecommendationResponse): StartupRecomendada | null {
  if (typeof data.startupId !== "string" || !data.startupId) return null;
  const score = typeof data.scoreFinal === "number" ? data.scoreFinal : 0;
  const nome = typeof data.startupName === "string" && data.startupName
    ? data.startupName
    : `Startup ${data.startupId.slice(0, 8)}`;
  const classification = typeof data.classification === "string" ? data.classification : "Recomendada";
  const startup: StartupDescoberta = {
    id: data.startupId,
    nome,
    segmento: "Outro",
    segmentosSecundarios: [],
    categoria: classification,
    estagio: "Operação",
    cidade: "",
    uf: "",
    remota: false,
    fundacao: new Date().getFullYear(),
    verificada: false,
    descricao: classification,
    tags: [],
    necessidades: [],
    tamanhoEquipe: 0,
    modeloNegocio: "",
    mercadoAlvo: "",
    canvas: { problema: "", solucao: "", mercado: "", tracao: "" },
    captacao: {
      meta: 0,
      captado: 0,
      valuation: 0,
      equity: 0,
      instrumento: "",
      rodada: "",
      investidoresConfirmados: 0,
    },
    metrica: { rotulo: "Score", valor: `${score}` },
    corLogo: "neutro",
    interesseReciproco: false,
  };
  return {
    startup,
    compatibilidade: {
      total: score,
      notas: { segmento: score, estagio: score, ticket: score, regiao: score, disponibilidade: score },
    },
    statusInteresse: "nenhum",
    salvo: false,
  };
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Filtro puro, usado também pelas telas para filtrar a lista no cliente sem
// buscar de novo a cada tecla.
export function aplicarFiltros(lista: StartupRecomendada[], filtros: FiltrosDescoberta) {
  const termo = normalizar(filtros.busca?.trim() ?? "");
  return lista.filter(({ startup }) => {
    if (filtros.segmento && startup.segmento !== filtros.segmento) return false;
    if (filtros.estagio && startup.estagio !== filtros.estagio) return false;
    if (!termo) return true;
    const alvo = [
      startup.nome,
      startup.segmento,
      ...startup.segmentosSecundarios,
      startup.categoria,
      startup.descricao,
      startup.cidade,
      ...startup.tags,
    ].join(" ");
    return normalizar(alvo).includes(termo);
  });
}

export async function obterTeseInvestidor(userKey: string): Promise<TeseInvestidor> {
  const respostas = await loadAnswers<RespostasInvestidor>(userKey, "investidor");
  return teseDasRespostas(respostas);
}

// Valor fictício até o back ter carteira/tesouraria do investidor
export async function obterTesouraria(): Promise<string> {
  return `${TESOURARIA_MOCK.percentualAlocado}% de ${formatarMoeda(TESOURARIA_MOCK.total)}`;
}

export async function listarStartupsRecomendadas(
  userKey: string,
  filtros: FiltrosDescoberta = {},
): Promise<StartupRecomendada[]> {
  void userKey;
  const response = await api.get<RecommendationResponse[]>(
    `/api/scorecard/recommendations?investorId=${INVESTOR_ID}&limit=10`,
  );
  const recomendacoes = response.data
    .map(mapearRecomendacao)
    .filter((item): item is StartupRecomendada => item !== null);
  return aplicarFiltros(recomendacoes, filtros);
}

export async function obterStartup(userKey: string, id: string): Promise<StartupDetalhe | null> {
  void userKey;
  void id;
  return null;
}

export async function salvarStartup(userKey: string, id: string): Promise<void> {
  const salvos = lerSalvos(userKey);
  if (!salvos.includes(id)) gravar(chaveSalvos(userKey), [...salvos, id]);
}

export async function removerSalvo(userKey: string, id: string): Promise<void> {
  gravar(
    chaveSalvos(userKey),
    lerSalvos(userKey).filter((salvo) => salvo !== id),
  );
}

export async function listarSalvos(userKey: string): Promise<StartupRecomendada[]> {
  const salvos = lerSalvos(userKey);
  const recomendacoes = await listarStartupsRecomendadas(userKey);
  return recomendacoes.filter((item) => salvos.includes(item.startup.id));
}

export async function obterStatusInteresse(userKey: string, id: string): Promise<StatusInteresse> {
  return lerInteresses(userKey)[id] ?? "nenhum";
}

// Investidor demonstra interesse. Se a startup já tinha demonstrado interesse
// nele, vira match na hora; senão, fica "enviado" aguardando a startup.
export async function registrarInteresse(userKey: string, id: string): Promise<StatusInteresse> {
  void userKey;
  throw new Error(`Startup não encontrada: ${id}`);
}

// Só dá para desfazer enquanto a startup não respondeu; depois do match o
// status fica como está.
export async function desfazerInteresse(userKey: string, id: string): Promise<StatusInteresse> {
  const interesses = lerInteresses(userKey);
  if (interesses[id] !== "enviado") return interesses[id] ?? "nenhum";
  const restantes = { ...interesses };
  delete restantes[id];
  gravar(chaveInteresses(userKey), restantes);
  return "nenhum";
}

// Startups com match ("Meus unios")
export async function listarUnios(userKey: string): Promise<StartupRecomendada[]> {
  const interesses = lerInteresses(userKey);
  const recomendacoes = await listarStartupsRecomendadas(userKey);
  return recomendacoes.filter((item) => interesses[item.startup.id] === "match");
}

// Contato da startup: só existe para quem deu match (garantido aqui, não só
// na tela). Devolve apenas canais válidos.
export async function obterContato(userKey: string, id: string): Promise<DadosUnio | null> {
  if (lerInteresses(userKey)[id] !== "match") return null;
  return { contato: contatoValido(CONTATOS_STARTUPS[id]), matchEm: unioLocal.dataDoMatch(userKey, id) };
}

// Desfaz o match: o status volta para "nenhum" e o unio sai da lista
export async function desfazerMatch(userKey: string, id: string): Promise<StatusInteresse> {
  const interesses = lerInteresses(userKey);
  if (interesses[id] !== "match") return interesses[id] ?? "nenhum";
  const restantes = { ...interesses };
  delete restantes[id];
  gravar(chaveInteresses(userKey), restantes);
  unioLocal.desfazer(userKey, id);
  return "nenhum";
}

export async function registrarEvento(userKey: string, id: string, tipo: TipoEventoUnio): Promise<void> {
  unioLocal.registrarEvento(userKey, id, tipo);
}
