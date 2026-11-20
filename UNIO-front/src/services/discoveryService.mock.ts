import { CONTATOS_STARTUPS } from "../mocks/contatosMock";
import { STARTUPS_MOCK, TESOURARIA_MOCK } from "../mocks/startupsMock";
import type { DadosUnio, ResultadoDesfazerMatch, TipoEventoUnio } from "../types/contato";
import type {
  FiltrosDescoberta,
  RefScorecard,
  StartupDescobertaCompleta,
  StartupDetalhe,
  StartupRecomendada,
  StatusInteresse,
  TeseInvestidor,
} from "../types/discovery";
import type { RespostasInvestidor } from "../types/onboarding";
import { contatoValido } from "../utils/contato";
import { formatarMoeda } from "../utils/formatoDescoberta";
import { ordenarComPopularidade } from "../utils/popularidade";
import {
  calcularCompatibilidade,
  explicarCompatibilidade,
  investidorDaTese,
  ladoDaStartupDescoberta,
  teseDasRespostas,
} from "./compatibilidade";
import { loadAnswers } from "./onboardingService";
import { percentualVisivel } from "./popularidadePerfis";
import { unioLocalInvestidor as unioLocal } from "./unioLocal";

// MODO MOCK (VITE_MOCK_BACKEND=true) dos dados das telas do investidor
// (Descobrir, Perfil da startup, Salvos, Meus unios). O modo API fica em
// discoveryService.api.ts e as telas importam só discoveryService.ts, que
// escolhe o modo (ADR-008). O parâmetro userKey (e-mail) só existe por causa
// do localStorage.
//
// Aqui tudo é de exemplo: startups de mocks/startupsMock.ts, compatibilidade
// calculada no front (services/compatibilidade.ts), salvos e interesses no
// localStorage por e-mail, "interesseReciproco" fazendo o match na hora, e
// contatos de mocks/contatosMock.ts.

const LATENCIA_MS = 350;

const chaveSalvos = (userKey: string) => `unio_salvos_${userKey}`;
const chaveInteresses = (userKey: string) => `unio_interesses_${userKey}`;

type InteressesSalvos = Record<string, Exclude<StatusInteresse, "nenhum">>;

function esperar() {
  return new Promise((resolve) => setTimeout(resolve, LATENCIA_MS));
}

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

function buscarMock(id: string) {
  return STARTUPS_MOCK.find((startup) => startup.id === id);
}

function montar(
  startup: StartupDescobertaCompleta,
  tese: TeseInvestidor,
  salvos: string[],
  interesses: InteressesSalvos,
): StartupRecomendada {
  return {
    startup,
    compatibilidade: calcularCompatibilidade(investidorDaTese(tese), ladoDaStartupDescoberta(startup)),
    statusInteresse: interesses[startup.id] ?? "nenhum",
    salvo: salvos.includes(startup.id),
    popularidade: percentualVisivel(startup.id),
  };
}

function montarVarias(userKey: string, startups: StartupDescobertaCompleta[], tese: TeseInvestidor) {
  const salvos = lerSalvos(userKey);
  const interesses = lerInteresses(userKey);
  // Por compatibilidade; popularidade só desempata e dá um bônus pequeno de
  // ordenação (utils/popularidade.ts, ADR-006)
  return ordenarComPopularidade(
    startups.map((startup) => montar(startup, tese, salvos, interesses)),
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
  const tese = await obterTeseInvestidor(userKey);
  await esperar();
  return aplicarFiltros(montarVarias(userKey, STARTUPS_MOCK, tese), filtros);
}

export async function obterStartup(userKey: string, id: string): Promise<StartupDetalhe | null> {
  const tese = await obterTeseInvestidor(userKey);
  await esperar();
  const startup = buscarMock(id);
  if (!startup) return null;
  const compatibilidade = calcularCompatibilidade(investidorDaTese(tese), ladoDaStartupDescoberta(startup));
  const item = montar(startup, tese, lerSalvos(userKey), lerInteresses(userKey));
  return { ...item, motivos: explicarCompatibilidade(tese, startup, compatibilidade) };
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
  const tese = await obterTeseInvestidor(userKey);
  await esperar();
  const salvos = lerSalvos(userKey);
  return montarVarias(
    userKey,
    STARTUPS_MOCK.filter((startup) => salvos.includes(startup.id)),
    tese,
  );
}

export async function obterStatusInteresse(userKey: string, id: string): Promise<StatusInteresse> {
  return lerInteresses(userKey)[id] ?? "nenhum";
}

// Investidor demonstra interesse. Se a startup já tinha demonstrado interesse
// nele, vira match na hora; senão, fica "enviado" aguardando a startup.
// `_scorecard` só é usado no modo API (feedback do algoritmo)
export async function registrarInteresse(
  userKey: string,
  id: string,
  _scorecard?: RefScorecard | null,
): Promise<StatusInteresse> {
  const startup = buscarMock(id);
  if (!startup) throw new Error("Startup não encontrada");
  await esperar();
  const interesses = lerInteresses(userKey);
  const atual = interesses[id];
  if (atual) return atual;
  // Depois de um "Desfazer match", o interesse recíproco do mock não vale mais
  const reciproco = startup.interesseReciproco && !unioLocal.reciprocoUsado(userKey, id);
  const novo = reciproco ? "match" : "enviado";
  gravar(chaveInteresses(userKey), { ...interesses, [id]: novo });
  if (novo === "match") unioLocal.registrarMatch(userKey, id);
  return novo;
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
  const tese = await obterTeseInvestidor(userKey);
  await esperar();
  const interesses = lerInteresses(userKey);
  return montarVarias(
    userKey,
    STARTUPS_MOCK.filter((startup) => interesses[startup.id] === "match"),
    tese,
  );
}

// Contato da startup: só existe para quem deu match (garantido aqui, não só
// na tela). Devolve apenas canais válidos.
export async function obterContato(userKey: string, id: string): Promise<DadosUnio | null> {
  if (lerInteresses(userKey)[id] !== "match") return null;
  return { contato: contatoValido(CONTATOS_STARTUPS[id]), matchEm: unioLocal.dataDoMatch(userKey, id) };
}

// Desfaz o match: o status volta para "nenhum" e o unio sai da lista. No mock
// quem cancela as reuniões é a tela (reunioesService), por isso
// reunioesCanceladas fica null.
export async function desfazerMatch(userKey: string, id: string): Promise<ResultadoDesfazerMatch> {
  const interesses = lerInteresses(userKey);
  if (interesses[id] !== "match") return { status: interesses[id] ?? "nenhum", reunioesCanceladas: null };
  const restantes = { ...interesses };
  delete restantes[id];
  gravar(chaveInteresses(userKey), restantes);
  unioLocal.desfazer(userKey, id);
  return { status: "nenhum", reunioesCanceladas: null };
}

export async function registrarEvento(userKey: string, id: string, tipo: TipoEventoUnio): Promise<void> {
  unioLocal.registrarEvento(userKey, id, tipo);
}
