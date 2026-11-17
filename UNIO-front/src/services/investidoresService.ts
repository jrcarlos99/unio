import type { UserProfile } from "../contexts/AuthContext";
import { CONTATOS_INVESTIDORES } from "../mocks/contatosMock";
import { CAPTACAO_MOCK } from "../mocks/investidoresMock";
import api from "./api";
import type { DadosUnio, TipoEventoUnio } from "../types/contato";
import type { StatusInteresse } from "../types/discovery";
import type {
  FiltrosInvestidores,
  InvestidorDescoberta,
  InvestidorDetalhe,
  InvestidorRecomendado,
  ResumoStartupInvestidores,
} from "../types/investidores";
import { contatoValido } from "../utils/contato";
import { formatarMoeda } from "../utils/formatoDescoberta";
import { obterContextoStartup } from "./dashboardStartupService";
import { chaveUsuario } from "./onboardingService";
import { unioLocalStartup as unioLocal } from "./unioLocal";

// Único ponto de dados dos investidores vistos pela startup: aba
// "Investidores", Salvos, Meus unios, perfil do investidor e bloco
// "Investidores recomendados" da Visão geral. As telas usam SÓ estas funções
// (ou o recomendacoesService, que escolhe o serviço pelo perfil); quando o
// back tiver os endpoints, troca-se a implementação aqui por chamadas HTTP e
// as telas não mudam. O parâmetro `user` só existe por causa do localStorage
// e do perfil local: com a API, o token já identifica a startup.
//
// MOCK — o que AINDA NÃO EXISTE no back (levar ao squad):
// - Listagem de investidores/mentores recomendados para a startup, com busca
//   e filtros, e o perfil completo de um investidor por id.
// - Salvos da startup.
// - Interesse da startup no investidor e MATCH MÚTUO do lado da startup
//   (status por par; só depois do match há conversa/reunião). No mock,
//   "interesseReciproco" faz o match acontecer na hora.
// - Captação atual da startup (rodada).
// - Contato do investidor (só para quem deu match), desfazer match e eventos
//   de contato/reunião (ver mocks/contatosMock.ts e services/unioLocal.ts).
// O score usa a mesma função pura do Descobrir (services/compatibilidade.ts).
//
// Salvos e interesses ficam no localStorage, por e-mail do usuário.

const INVESTOR_ID = "00000000-0000-0000-0000-000000000002";

const chaveInteresses = (userKey: string) => `unio_interesses_startup_${userKey}`;
const chaveSalvos = (userKey: string) => `unio_salvos_startup_${userKey}`;

type InteressesSalvos = Record<string, Exclude<StatusInteresse, "nenhum">>;

// localStorage pode lançar erro (modo privado, cota cheia); nesse caso a tela
// continua funcionando, só não lembra dos salvos/interesses ao recarregar.
function ler<T>(user: UserProfile | null, chave: (userKey: string) => string, padrao: T): T {
  if (!user) return padrao;
  try {
    const bruto = localStorage.getItem(chave(chaveUsuario(user)));
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(user: UserProfile | null, chave: (userKey: string) => string, valor: unknown) {
  if (!user) return;
  try {
    localStorage.setItem(chave(chaveUsuario(user)), JSON.stringify(valor));
  } catch {
    // ver comentário em ler()
  }
}

const lerInteresses = (user: UserProfile | null) => ler<InteressesSalvos>(user, chaveInteresses, {});
const lerSalvos = (user: UserProfile | null) => ler<string[]>(user, chaveSalvos, []);

interface RecommendationResponse {
  startupId?: unknown;
  scoreFinal?: unknown;
  classification?: unknown;
}

function mapearRecomendacao(data: RecommendationResponse): InvestidorRecomendado | null {
  if (typeof data.startupId !== "string" || !data.startupId) return null;
  const score = typeof data.scoreFinal === "number" ? data.scoreFinal : 0;
  const classification = typeof data.classification === "string" ? data.classification : "Recomendado";
  const investidor: InvestidorDescoberta = {
    id: data.startupId,
    nome: `Startup ${data.startupId.slice(0, 8)}`,
    tipo: "Ambos",
    cidade: "",
    uf: "",
    verificado: false,
    tese: classification,
    segmentosInteresse: [],
    estagiosInteresse: [],
    ticketMin: null,
    ticketMax: null,
    regioesInteresse: [],
    disponibilidade: "Média",
    portfolio: 0,
    bio: "",
    tesePrincipal: classification,
    buscaEmStartups: [],
    comoApoia: [],
    desde: new Date().getFullYear(),
    portfolioPortoDigital: 0,
    tempoResposta: "",
    interesseReciproco: false,
  };
  return {
    investidor,
    compatibilidade: {
      total: score,
      notas: { segmento: score, estagio: score, ticket: score, regiao: score, disponibilidade: score },
    },
    statusInteresse: "nenhum",
    salvo: false,
  };
}

// "Recife, PE" / "Recife - PE" / "Recife/PE" → cidade e UF
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Filtro puro, usado também pelas telas para filtrar no cliente a cada tecla
export function aplicarFiltrosInvestidores(lista: InvestidorRecomendado[], filtros: FiltrosInvestidores) {
  const termo = normalizar(filtros.busca?.trim() ?? "");
  return lista.filter(({ investidor }) => {
    if (filtros.segmento && !investidor.segmentosInteresse.includes(filtros.segmento)) return false;
    if (filtros.tipo && investidor.tipo !== filtros.tipo && investidor.tipo !== "Ambos") return false;
    if (!termo) return true;
    const alvo = [
      investidor.nome,
      investidor.tese,
      investidor.cidade,
      investidor.tipo,
      ...investidor.segmentosInteresse,
      ...investidor.estagiosInteresse,
    ].join(" ");
    return normalizar(alvo).includes(termo);
  });
}

export async function obterResumoStartup(user: UserProfile | null): Promise<ResumoStartupInvestidores> {
  const { dados } = await obterContextoStartup(user);
  const capital = dados.capitalProcurado;
  const percentual = Math.round((CAPTACAO_MOCK.captado / CAPTACAO_MOCK.meta) * 100);
  return {
    segmento: dados.segmento,
    estagio: dados.estagio,
    capitalProcurado: capital === null ? null : typeof capital === "number" ? formatarMoeda(capital) : capital,
    captacao: `${percentual}% de ${formatarMoeda(CAPTACAO_MOCK.meta)}`,
  };
}

export async function listarInvestidoresRecomendados(
  user: UserProfile | null,
  filtros: FiltrosInvestidores = {},
): Promise<InvestidorRecomendado[]> {
  void user;
  const response = await api.get<RecommendationResponse[]>(
    `/api/scorecard/recommendations?investorId=${INVESTOR_ID}&limit=10`,
  );
  const recomendacoes = response.data
    .map(mapearRecomendacao)
    .filter((item): item is InvestidorRecomendado => item !== null);
  return aplicarFiltrosInvestidores(recomendacoes, filtros);
}

export async function obterInvestidor(user: UserProfile | null, id: string): Promise<InvestidorDetalhe | null> {
  void user;
  void id;
  return null;
}

export async function salvarInvestidor(user: UserProfile | null, id: string): Promise<void> {
  const salvos = lerSalvos(user);
  if (!salvos.includes(id)) gravar(user, chaveSalvos, [...salvos, id]);
}

export async function removerSalvo(user: UserProfile | null, id: string): Promise<void> {
  gravar(
    user,
    chaveSalvos,
    lerSalvos(user).filter((salvo) => salvo !== id),
  );
}

export async function listarSalvos(user: UserProfile | null): Promise<InvestidorRecomendado[]> {
  const recomendacoes = await listarInvestidoresRecomendados(user);
  const salvos = lerSalvos(user);
  return recomendacoes.filter((item) => salvos.includes(item.investidor.id));
}

// Investidores com match ("Meus unios")
export async function listarUnios(user: UserProfile | null): Promise<InvestidorRecomendado[]> {
  const recomendacoes = await listarInvestidoresRecomendados(user);
  const interesses = lerInteresses(user);
  return recomendacoes.filter((item) => interesses[item.investidor.id] === "match");
}

export async function obterStatusInteresse(user: UserProfile | null, id: string): Promise<StatusInteresse> {
  return lerInteresses(user)[id] ?? "nenhum";
}

// A startup demonstra interesse. Se o investidor já tinha demonstrado
// interesse nela, vira match na hora; senão, fica "enviado".
export async function registrarInteresse(user: UserProfile | null, id: string): Promise<StatusInteresse> {
  void user;
  throw new Error(`Investidor não encontrado: ${id}`);
}

// Só dá para desfazer enquanto o investidor não respondeu
export async function desfazerInteresse(user: UserProfile | null, id: string): Promise<StatusInteresse> {
  const interesses = lerInteresses(user);
  if (interesses[id] !== "enviado") return interesses[id] ?? "nenhum";
  const restantes = { ...interesses };
  delete restantes[id];
  gravar(user, chaveInteresses, restantes);
  return "nenhum";
}

// Contato do investidor: só existe para quem deu match (garantido aqui, não
// só na tela). Devolve apenas canais válidos.
export async function obterContato(user: UserProfile | null, id: string): Promise<DadosUnio | null> {
  if (!user || lerInteresses(user)[id] !== "match") return null;
  return { contato: contatoValido(CONTATOS_INVESTIDORES[id]), matchEm: unioLocal.dataDoMatch(chaveUsuario(user), id) };
}

// Desfaz o match: o status volta para "nenhum" e o unio sai da lista
export async function desfazerMatch(user: UserProfile | null, id: string): Promise<StatusInteresse> {
  const interesses = lerInteresses(user);
  if (!user || interesses[id] !== "match") return interesses[id] ?? "nenhum";
  const restantes = { ...interesses };
  delete restantes[id];
  gravar(user, chaveInteresses, restantes);
  unioLocal.desfazer(chaveUsuario(user), id);
  return "nenhum";
}

export async function registrarEvento(user: UserProfile | null, id: string, tipo: TipoEventoUnio): Promise<void> {
  if (user) unioLocal.registrarEvento(chaveUsuario(user), id, tipo);
}
