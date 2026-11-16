import { CONTATOS_STARTUPS } from "../mocks/contatosMock";
import { STARTUPS_MOCK, TESOURARIA_MOCK } from "../mocks/startupsMock";
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
  startup: StartupDescoberta,
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

function montarVarias(userKey: string, startups: StartupDescoberta[], tese: TeseInvestidor) {
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
  const item = montar(startup, tese, lerSalvos(userKey), lerInteresses(userKey));
  return { ...item, motivos: explicarCompatibilidade(tese, startup, item.compatibilidade) };
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
export async function registrarInteresse(userKey: string, id: string): Promise<StatusInteresse> {
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
