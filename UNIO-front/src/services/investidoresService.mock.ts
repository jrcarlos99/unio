import type { UserProfile } from "../contexts/AuthContext";
import { CONTATOS_INVESTIDORES } from "../mocks/contatosMock";
import { CAPTACAO_MOCK, INVESTIDORES_MOCK } from "../mocks/investidoresMock";
import type { DadosUnio, ResultadoDesfazerMatch, TipoEventoUnio } from "../types/contato";
import type { RefScorecard, StatusInteresse } from "../types/discovery";
import type { DadosStartup } from "../types/dashboard";
import type {
  FiltrosInvestidores,
  InvestidorDescobertaCompleto,
  InvestidorDetalhe,
  InvestidorRecomendado,
  ResumoStartupInvestidores,
} from "../types/investidores";
import { contatoValido } from "../utils/contato";
import { formatarMoeda } from "../utils/formatoDescoberta";
import { ordenarComPopularidade } from "../utils/popularidade";
import {
  calcularCompatibilidade,
  explicarParaStartup,
  faixaDeCapital,
  type LadoInvestidor,
  type LadoStartup,
} from "./compatibilidade";
import { obterContextoStartup } from "./dashboardStartupService";
import { chaveUsuario } from "./onboardingService";
import { percentualVisivel } from "./popularidadePerfis";
import { unioLocalStartup as unioLocal } from "./unioLocal";

// MODO MOCK (VITE_MOCK_BACKEND=true) dos investidores vistos pela startup:
// aba "Investidores", Salvos, Meus unios, perfil do investidor e bloco
// "Investidores recomendados" da Visão geral. O modo API fica em
// investidoresService.api.ts e as telas importam só investidoresService.ts,
// que escolhe o modo (ADR-008). O parâmetro `user` só existe por causa do
// localStorage e do perfil local.
//
// Aqui tudo é de exemplo: investidores de mocks/investidoresMock.ts, score
// calculado no front (services/compatibilidade.ts), salvos e interesses no
// localStorage por e-mail, "interesseReciproco" fazendo o match na hora e
// contatos de mocks/contatosMock.ts.

const LATENCIA_MS = 350;

const chaveInteresses = (userKey: string) => `unio_interesses_startup_${userKey}`;
const chaveSalvos = (userKey: string) => `unio_salvos_startup_${userKey}`;

type InteressesSalvos = Record<string, Exclude<StatusInteresse, "nenhum">>;

function esperar() {
  return new Promise((resolve) => setTimeout(resolve, LATENCIA_MS));
}

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

function buscarMock(id: string) {
  return INVESTIDORES_MOCK.find((item) => item.id === id);
}

// "Recife, PE" / "Recife - PE" / "Recife/PE" → cidade e UF
function separarLocalizacao(texto: string) {
  const partes = texto.trim().match(/^(.*?)[\s,/-]+([A-Za-z]{2})$/);
  return partes ? { cidade: partes[1].trim(), uf: partes[2].toUpperCase() } : { cidade: texto.trim(), uf: "" };
}

function ladoDaStartup(dados: DadosStartup): LadoStartup {
  const { cidade, uf } = separarLocalizacao(dados.localizacao);
  return {
    segmento: dados.segmento,
    segmentosSecundarios: [],
    estagio: dados.estagio,
    cidade,
    uf,
    // O cadastro da startup ainda não diz se ela opera remotamente
    remota: false,
    necessidades: dados.necessidades,
    capital: faixaDeCapital(dados.capitalProcurado),
  };
}

function ladoDoInvestidor(investidor: InvestidorDescobertaCompleto): LadoInvestidor {
  const temTicket = investidor.ticketMin !== null && investidor.ticketMax !== null;
  return {
    segmentosInteresse: investidor.segmentosInteresse,
    estagiosInteresse: investidor.estagiosInteresse,
    ticket: temTicket ? [investidor.ticketMin as number, investidor.ticketMax as number] : null,
    apenasMentor: investidor.tipo === "Mentor",
    disponibilidade: investidor.disponibilidade,
    regioesInteresse: investidor.regioesInteresse,
  };
}

async function carregarStartup(user: UserProfile | null) {
  const { dados } = await obterContextoStartup(user);
  return ladoDaStartup(dados);
}

function montarVarios(user: UserProfile | null, investidores: InvestidorDescobertaCompleto[], startup: LadoStartup) {
  const interesses = lerInteresses(user);
  const salvos = lerSalvos(user);
  const lista = investidores.map(
    (investidor): InvestidorRecomendado => ({
      investidor,
      compatibilidade: calcularCompatibilidade(ladoDoInvestidor(investidor), startup),
      statusInteresse: interesses[investidor.id] ?? "nenhum",
      salvo: salvos.includes(investidor.id),
      popularidade: percentualVisivel(investidor.id),
    }),
  );
  // Por compatibilidade; popularidade só desempata e dá um bônus pequeno de
  // ordenação (utils/popularidade.ts, ADR-006)
  return ordenarComPopularidade(
    lista,
    (item) => item.compatibilidade.total,
    (item) => item.popularidade,
  );
}

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
  const startup = await carregarStartup(user);
  await esperar();
  return aplicarFiltrosInvestidores(montarVarios(user, INVESTIDORES_MOCK, startup), filtros);
}

export async function obterInvestidor(user: UserProfile | null, id: string): Promise<InvestidorDetalhe | null> {
  const investidor = buscarMock(id);
  const startup = await carregarStartup(user);
  await esperar();
  if (!investidor) return null;
  const [item] = montarVarios(user, [investidor], startup);
  const compatibilidade = calcularCompatibilidade(ladoDoInvestidor(investidor), startup);
  return { ...item, motivos: explicarParaStartup(ladoDoInvestidor(investidor), startup, compatibilidade) };
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
  const startup = await carregarStartup(user);
  await esperar();
  const salvos = lerSalvos(user);
  return montarVarios(
    user,
    INVESTIDORES_MOCK.filter((investidor) => salvos.includes(investidor.id)),
    startup,
  );
}

// Investidores com match ("Meus unios")
export async function listarUnios(user: UserProfile | null): Promise<InvestidorRecomendado[]> {
  const startup = await carregarStartup(user);
  await esperar();
  const interesses = lerInteresses(user);
  return montarVarios(
    user,
    INVESTIDORES_MOCK.filter((investidor) => interesses[investidor.id] === "match"),
    startup,
  );
}

export async function obterStatusInteresse(user: UserProfile | null, id: string): Promise<StatusInteresse> {
  return lerInteresses(user)[id] ?? "nenhum";
}

// A startup demonstra interesse. Se o investidor já tinha demonstrado
// interesse nela, vira match na hora; senão, fica "enviado".
// `_scorecard` só é usado no modo API (feedback do algoritmo)
export async function registrarInteresse(
  user: UserProfile | null,
  id: string,
  _scorecard?: RefScorecard | null,
): Promise<StatusInteresse> {
  const investidor = buscarMock(id);
  if (!investidor) throw new Error("Investidor não encontrado");
  await esperar();
  const interesses = lerInteresses(user);
  const atual = interesses[id];
  if (atual) return atual;
  // Depois de um "Desfazer match", o interesse recíproco do mock não vale mais
  const reciproco = investidor.interesseReciproco && !(user && unioLocal.reciprocoUsado(chaveUsuario(user), id));
  const novo = reciproco ? "match" : "enviado";
  gravar(user, chaveInteresses, { ...interesses, [id]: novo });
  if (novo === "match" && user) unioLocal.registrarMatch(chaveUsuario(user), id);
  return novo;
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

// Desfaz o match: o status volta para "nenhum" e o unio sai da lista. No mock
// quem cancela as reuniões é a tela (reunioesService).
export async function desfazerMatch(user: UserProfile | null, id: string): Promise<ResultadoDesfazerMatch> {
  const interesses = lerInteresses(user);
  if (!user || interesses[id] !== "match") return { status: interesses[id] ?? "nenhum", reunioesCanceladas: null };
  const restantes = { ...interesses };
  delete restantes[id];
  gravar(user, chaveInteresses, restantes);
  unioLocal.desfazer(chaveUsuario(user), id);
  return { status: "nenhum", reunioesCanceladas: null };
}

export async function registrarEvento(user: UserProfile | null, id: string, tipo: TipoEventoUnio): Promise<void> {
  if (user) unioLocal.registrarEvento(chaveUsuario(user), id, tipo);
}
